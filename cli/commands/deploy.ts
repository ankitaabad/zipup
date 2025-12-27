import * as tar from "tar";
import { Command } from "commander";
import fs from "fs";
import path from "path";
import ora from "ora";
import { loadConfig } from "../config";

export const deployCommand = new Command("deploy")
  .argument("<dir>", "build directory")
  .description("Deploy an artifact")
  .action(async (dir) => {
    const spinner = ora("Preparing deployment").start();

    if (!fs.existsSync(dir)) {
      spinner.fail("Directory does not exist");
      process.exit(1);
    }

    const config = loadConfig();

    // 1️⃣ Create artifact
    spinner.text = "Creating artifact";
    const res = await fetch(`${config.HOST}/artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Key": config.APP_KEY,
        "X-Secret-Key": config.SECRET_KEY,
      },
      body: JSON.stringify({ app_key: config.APP_KEY }),
    });

    if (!res.ok) throw new Error(await res.text());

    const { id } = (await res.json()).data;
    console.log("🚀 Deploying artifact:", id);

    // 2️⃣ Create tar.gz
    spinner.text = "Creating archive";
    const tarPath = path.resolve(`passup_artifact_${id}.tgz`);
    const files = fs.readdirSync(dir);

    await tar.c(
      {
        gzip: true,
        cwd: dir,
        portable: true,
        file: tarPath,
      },
      files
    );

    // 3️⃣ Convert to Blob (IMPORTANT)
    spinner.text = "Uploading artifact";
    const buffer = fs.readFileSync(tarPath);
    const blob = new Blob([buffer], { type: "application/gzip" });

    const form = new FormData();
    form.append("artifact", blob, path.basename(tarPath));

    const uploadRes = await fetch(
      `${config.HOST}/artifacts/${id}/upload`,
      {
        method: "POST",
        body: form, 
      }
    );


    spinner.succeed("✅ Deployment uploaded successfully");

    // fs.unlinkSync(tarPath);
  });
