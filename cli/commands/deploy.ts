import * as tar from "tar";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import ora from "ora";
import { loadConfig } from "../config";
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
export const deployCommand = new Command("deploy")
  .argument("<dir>", "build directory")
  .description("Deploy an artifact")
  .action(async (dir) => {
    const artifactCreationSpinner = ora("Preparing deployment...").start();

    if (!fs.existsSync(dir)) {
      artifactCreationSpinner.fail("Directory does not exist");
      process.exit(1);
    }

    const config = loadConfig();

    // 1️⃣ Create artifact
    artifactCreationSpinner.text = "Creating artifact...";
    const res = await fetch(`${config.HOST}/artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": config.APP_KEY,
        "X-Secret-Key": config.SECRET_KEY
      },
      body: JSON.stringify({ app_key: config.APP_KEY })
    });

    const { id } = (await res.json()).data;
    console.log(`artifact_id ${id}`);
    // 2️⃣ Create tar.gz
    const tarPath = path.resolve(`passup_artifact_${id}.tgz`);
    const files = fs.readdirSync(dir);

    await tar.c(
      {
        gzip: true,
        cwd: dir,
        portable: true,
        file: tarPath
      },
      files
    );

    // 3️⃣ Convert to Blob (IMPORTANT)

    const buffer = fs.readFileSync(tarPath);
    const size = formatBytes(buffer.length);
    artifactCreationSpinner.succeed(
      `Artifact created successfully, size : ${size}`
    );
    const uploadingArtifactSpinner = ora("Uploading artifact...").start();
    const blob = new Blob([buffer], { type: "application/gzip" });

    const form = new FormData();
    form.append("artifact", blob, path.basename(tarPath));

    const uploadRes = await fetch(`${config.HOST}/artifacts/${id}/upload`, {
      method: "POST",
      body: form
    });

    uploadingArtifactSpinner.succeed("Artifact Successfully uploaded");
    const deletingLocalArtifactSpinner = ora(
      "Deleting local artifact..."
    ).start();
    fs.unlinkSync(tarPath);
    deletingLocalArtifactSpinner.succeed("Local artifact deleted");
  });
