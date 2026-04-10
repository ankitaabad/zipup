import { createBodyHash, DEPLOYMENT_STATUS, signPayload } from "@zipup/common";
import * as tar from "tar";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import ora from "ora";
import { loadConfig, zipupConfig } from "../config";
import { callFetch, printFailureLogs, step } from "../helper";
import cfonts from "cfonts";
import pm from "picomatch";
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const deployCommand = new Command("deploy")
  // .argument("<dir>", "build directory (overrides buildFolder)")
  .description("Deploy an artifact, Get api key and secret key from the console")
  .option("--host <url>", "API host, The server domain/IP address where you installed the app")
  .option("--app-key <key>", "Application key (discouraged; prefer env var ZIPUP_APP_KEY)")
  .option("--secret-key <key>", "Secret key (discouraged; prefer env vars ZIPUP_SECRET_KEY)")
  .option("--build-folder <path>", "Build folder location, content of build folder is uploaded as an artifact")
  .option(
    "--tag <tag>",
    "Tag (repeatable)",
    (val, acc) => {
      acc.push(val);
      return acc;
    },
    [] as string[]
  )
  .option(
    "--ignore <pattern>",
    "Ignore files (glob, repeatable, relative to build folder)",
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
    let deploymentStatus, deploymentLogs;
    try {
      const config = await step<zipupConfig>(
        "Validating configuration...",
        async () => {
          return loadConfig(options);
        }
      );

      const buildDir = await step("Verifying build folder...", async () => {
        const buildDir = path.resolve(config.buildFolder);

        if (!fs.existsSync(buildDir)) {
          throw new Error("Build folder does not exist.");
        }
        return buildDir;
      });

      const artifactId = await step("Creating artifact...", async () => {
        const body = JSON.stringify({
          app_key: config.appKey,
          tags: config.tags
        });
        const bodyHash = createBodyHash(body);
        const expires = Math.floor(Date.now() / 1000) + 300; // expires in 5 minutes
        const signature = signPayload(
          "POST",
          "/api/artifacts",
          bodyHash,
          expires,
          config.secretKey
        );

        const res = await callFetch<{ id: string }>(async () => {
          return await fetch(`${config.host}/api/artifacts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Zipup-App-Key": config.appKey,
              "Zipup-Expires": expires.toString(),
              "Zipup-Signature": signature,
              "Zipup-Body-Hash": bodyHash
            },
            body
          });
        });
        const { id } = res;
        if (!id) {
          throw new Error("Artifact creation failed");
        }
        return id;
      });
      tarPath = await step("Archiving build folder...", async () => {
        const tarPath = path.resolve(`zipup_artifact_${artifactId}.tgz`);
        const files = fs.readdirSync(buildDir);
        const picoMatches = config.ignore.map((x) => pm(x));
        await tar.c(
          {
            gzip: true,
            cwd: buildDir,
            portable: true,
            file: tarPath,
            filter: (filePath) => {
              // filePath is relative to cwd
              const shouldIgnore = picoMatches.some((isMatch) =>
                isMatch(filePath)
              );

              return !shouldIgnore;
            }
          },
          files
        );
        return tarPath;
      });
      const buffer = fs.readFileSync(tarPath);
      const size = formatBytes(buffer.length);
      const deploymentId = await step(
        `Uploading artifact (${size})...`,
        async () => {
          const bodyHashForUpload = createBodyHash(buffer); // hash the file contents
          const uploadPath = `/api/artifacts/${artifactId}/upload`;
          const expires = Math.floor(Date.now() / 1000) + 300; // expires in 5 minutes
          const signatureForUpload = signPayload(
            "POST",
            uploadPath,
            bodyHashForUpload,
            expires,
            config.secretKey
          );
          const blob = new Blob([buffer], { type: "application/gzip" });
          const form = new FormData();
          form.append("artifact", blob, path.basename(tarPath));
          const { deployment_id } = await callFetch<{ deployment_id: string }>(
            async () => {
              return await fetch(`${config.host}${uploadPath}`, {
                method: "POST",
                body: form,
                headers: {
                  // "Content-Type": "application/json",
                  "Zipup-App-Key": config.appKey,
                  // "Zipup-Timestamp": timestamp,
                  "Zipup-Signature": signatureForUpload,
                  "Zipup-Body-Hash": bodyHashForUpload,
                  "Zipup-Expires": expires.toString()
                }
              });
            }
          );
          return deployment_id;
        }
      );
      await step("Verifying deployment health...", async () => {
        const start = Date.now();
        const interval = 1000;
        const timeout = 60000;
        let status, logs;
        while (Date.now() - start < timeout) {
          const data = await callFetch<{
            status: DEPLOYMENT_STATUS;
            failureLogs: string;
          }>(async () => {
            return await fetch(
              `${config.host}/api/deployments/${deploymentId}`
            );
          });

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
          throw new Error(`Verifying deployment health: ${status}`);
        }
        return { status, logs };
      });
    } catch (error) {
      // console.error(error);
    } finally {
      if (tarPath && fs.existsSync(tarPath)) {
        await step("Cleaning up temporary files...", async () => {
          fs.unlinkSync(tarPath);
        });
      }
      if (deploymentStatus === DEPLOYMENT_STATUS.SUCCESS) {
        ora("").succeed("Deployment successful 🎉");
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
