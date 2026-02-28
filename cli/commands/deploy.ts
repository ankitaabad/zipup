import { createBodyHash, signPayload } from "@zipup/common";
import * as tar from "tar";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import ora from "ora";
import { loadConfig, zipupConfig } from "../config";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const deployCommand = new Command("deploy")
  .argument("<dir>", "build directory (overrides BUILD_FOLDER)")
  .description("Deploy an artifact")
  .option("--host <url>", "API host")
  .option("--app-key <key>", "Application key")
  .option("--secret-key <key>", "Secret key (discouraged; prefer env vars)")
  .option("--build-folder <path>", "Build folder location")
  .option(
    "--tag <tag>",
    "Tag (repeatable)",
    (val, acc) => {
      acc.push(val);
      return acc;
    },
    [] as string[]
  )
  .action(async (dir: string, options) => {
    const spinner = ora("Preparing deployment...").start();

    /**
     * Normalize CLI options → internal config keys
     */
    const cliConfig: Partial<zipupConfig> = {
      HOST: options.host,
      APP_KEY: options.appKey,
      SECRET_KEY: options.secretKey,
      BUILD_FOLDER: options.buildFolder,
      TAGS: options.tag?.length ? options.tag : undefined
    };

    /**
     * <dir> argument always wins for build folder
     */
    cliConfig.BUILD_FOLDER = dir;

    let config: zipupConfig;
    // remove undefined values to avoid overriding file/env configs with undefined
    Object.keys(cliConfig).forEach((key) => {
      if (
        cliConfig[key as keyof zipupConfig] === undefined ||
        cliConfig[key as keyof zipupConfig] === null
      ) {
        delete cliConfig[key as keyof zipupConfig];
      }
    });
    try {
      config = loadConfig(cliConfig);
    } catch {
      spinner.fail("Invalid configuration");
      process.exit(1);
    }

    const buildDir = path.resolve(config.BUILD_FOLDER);

    if (!fs.existsSync(buildDir)) {
      spinner.fail(`Build directory does not exist: ${buildDir}`);
      process.exit(1);
    }

    // 1️⃣ Create artifact record
    spinner.text = "Creating artifact...";
    const body = JSON.stringify({
      app_key: config.APP_KEY,
      tags: config.TAGS
    });

    const timestamp = Date.now().toString();
    const bodyHash = createBodyHash(body);

    const signature = signPayload(
      "POST",
      "/artifacts",
      timestamp,
      bodyHash,
      config.SECRET_KEY
    );

    const res = await fetch(`${config.HOST}/api/artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": config.APP_KEY,
        "X-Timestamp": timestamp,
        "X-Signature": signature
      },
      body
    });

    if (!res.ok) {
      spinner.fail(`Failed to create artifact (${res.status})`);
      process.exit(1);
    }

    const { id } = (await res.json()).data;
    spinner.text = `Creating artifact archive (id: ${id})...`;

    // 2️⃣ Create tar.gz
    const tarPath = path.resolve(`zipup_artifact_${id}.tgz`);
    const files = fs.readdirSync(buildDir);

    await tar.c(
      {
        gzip: true,
        cwd: buildDir,
        portable: true,
        file: tarPath
      },
      files
    );

    const buffer = fs.readFileSync(tarPath);
    const size = formatBytes(buffer.length);

    spinner.succeed(`Artifact created successfully (${size})`);

    // 3️⃣ Upload artifact
    const uploadSpinner = ora("Uploading artifact...").start();
    const bodyHashForUpload = createBodyHash(buffer); // hash the file contents
    console.log({ bodyHashForUpload });
    const uploadPath = `/api/artifacts/${id}/upload`;
    const signatureForUpload = signPayload(
      "POST",
      uploadPath,
      bodyHashForUpload,
      config.SECRET_KEY
    );
    console.log({ signatureForUpload, bodyHashForUpload });
    const blob = new Blob([buffer], { type: "application/gzip" });
    const form = new FormData();
    console.log({ tarPath });
    form.append("artifact", blob, path.basename(tarPath));

    const uploadRes = await fetch(`${config.HOST}${uploadPath}`, {
      method: "POST",
      body: form,
      headers: {
        // "Content-Type": "application/json",
        "Zipup-App-Key": config.APP_KEY,
        "Zipup-Timestamp": timestamp,
        "Zipup-Signature": signatureForUpload,
        "Zipup-Body-Hash": bodyHashForUpload
      }
    });

    if (!uploadRes.ok) {
      uploadSpinner.fail(`Upload failed (${uploadRes.status})`);
      process.exit(1);
    }

    uploadSpinner.succeed("Artifact successfully uploaded");

    // 4️⃣ Cleanup
    //todo: cleanup should be in finally
    const cleanupSpinner = ora("Cleaning up local files...").start();
    fs.unlinkSync(tarPath);
    cleanupSpinner.succeed("Local artifact deleted");
  });
