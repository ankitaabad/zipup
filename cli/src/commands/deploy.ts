import { createBodyHash, DEPLOYMENT_STATUS, signPayload } from "@zipup/common";
import * as tar from "tar";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import ora from "ora";
import { loadConfig, zipupConfig } from "../config";
import { printFailureLogs, step } from "../helper";
import cfonts from "cfonts";
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const deployCommand = new Command("deploy")
  // .argument("<dir>", "build directory (overrides BUILD_FOLDER)")
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
  .action(async (options) => {
    // const spinner = ora("Preparing deployment...").start();
    cfonts.say("Zipup", {
      // font: "3d", // slick fonts
      "font": "slick",
      align: "left",
      // colors: ["blue", "magenta"],
      background: "transparent",
      gradient: ["white", "blue"],
      letterSpacing: 1
    });
    let tarPath: string;
    let deploymentSuccess = false;
    let deploymentStatus, deploymentLogs;
    try {
      const config = await step<zipupConfig>(
        "Validating configuration...",
        async () => {
          return loadConfig(options);
        }
      );

      const buildDir = await step(
        "Checking if build folder exists.",
        async () => {
          const buildDir = path.resolve(config.BUILD_FOLDER);

          if (!fs.existsSync(buildDir)) {
            throw new Error("Build directory does not exist.");
          }
          return buildDir;
        }
      );

      const artifactId = await step("Creating artifact record...", async () => {
        const body = JSON.stringify({
          app_key: config.APP_KEY,
          tags: config.TAGS
        });
        const timestamp = Date.now().toString();
        const bodyHash = createBodyHash(body);

        const signature = signPayload(
          "POST",
          "/artifacts",
          bodyHash,
          config.SECRET_KEY
        );

        const res = await fetch(`${config.HOST}/api/artifacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Zipup-App-Key": config.APP_KEY,
            "Zipup-Timestamp": timestamp,
            "Zipup-Signature": signature
          },
          body
        });
        const { id } = (await res.json()).data;
        if (!id) {
          throw new Error("Artifact creation failed");
        }
        return id;
      });
      tarPath = await step("Archiving Build Folder...", async () => {
        const tarPath = path.resolve(`zipup_artifact_${artifactId}.tgz`);
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
        return tarPath;
      });
      const deploymentId = await step("Uploading artifact...", async () => {
        const buffer = fs.readFileSync(tarPath);
        const size = formatBytes(buffer.length);
        const bodyHashForUpload = createBodyHash(buffer); // hash the file contents
        const uploadPath = `/api/artifacts/${artifactId}/upload`;
        const signatureForUpload = signPayload(
          "POST",
          uploadPath,
          bodyHashForUpload,
          config.SECRET_KEY
        );
        const blob = new Blob([buffer], { type: "application/gzip" });
        const form = new FormData();
        form.append("artifact", blob, path.basename(tarPath));

        const uploadRes = await fetch(`${config.HOST}${uploadPath}`, {
          method: "POST",
          body: form,
          headers: {
            // "Content-Type": "application/json",
            "Zipup-App-Key": config.APP_KEY,
            // "Zipup-Timestamp": timestamp,
            "Zipup-Signature": signatureForUpload,
            "Zipup-Body-Hash": bodyHashForUpload
          }
        });
        const { deployment_id } = (await uploadRes.json()).data;
        return deployment_id;
      });
      await step("Checking deployment health status...", async () => {
        const start = Date.now();
        const interval = 1000;
        const timeout = 60000;
        let status, logs;
        while (Date.now() - start < timeout) {
          const res = await fetch(
            `${config.HOST}/api/deployments/${deploymentId}`
          );
          const data = (await res.json()).data;
          // console.log({ data });
          status = data.status;
          logs = data.failureLogs;
          if (status !== DEPLOYMENT_STATUS.IN_PROGRESS) {
            break;
          }

          await new Promise((r) => setTimeout(r, interval));
        }
        if (status === DEPLOYMENT_STATUS.IN_PROGRESS) {
          status = DEPLOYMENT_STATUS.TIMEOUT;
        }
        deploymentStatus = status;
        deploymentLogs = logs;
        if (status !== DEPLOYMENT_STATUS.SUCCESS) {
          throw new Error(`Checking deployment health status: ${status}`);
        }
        return { status, logs };
      });
      // deploymentStatus = status;
      // deploymentLogs = logs;
      // deploymentSuccess = true;
    } catch (error) {
      // console.error(error);
    } finally {
      await step("Cleaning Up...", async () => {
        if (tarPath && fs.existsSync(tarPath)) {
          fs.unlinkSync(tarPath);
        }
      });
      if (deploymentStatus === DEPLOYMENT_STATUS.SUCCESS) {
        ora("").succeed("Deployment complete!");
      } else {
        ora("").fail("Deployment failed!");
        if (deploymentLogs) {
          printFailureLogs(deploymentLogs);
        }
        process.exit(1);
      }
      process.exit(0);
    }
  });
