import { Hono } from "hono";
import { db } from "../../utils";
import { artifactsTable, appsTable } from "../db/schema";
import { generateId } from "../utils/helper";
import { eq, sql } from "drizzle-orm";
import fs from "fs-extra";
import path from "path";
import * as tar from "tar";

export const artifactsRouter = new Hono();

const ARTIFACT_ROOT = "/artifacts"; // main volume
const TEMP_DIR = path.join(ARTIFACT_ROOT, "temp");

fs.ensureDirSync(ARTIFACT_ROOT);
fs.ensureDirSync(TEMP_DIR);

/**
 * Create artifact record
 */
artifactsRouter.post("/", async (c) => {
  const { app_key } = await c.req.json();

  const app = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.app_key, app_key))
    .limit(1)
    .get();

  if (!app) return c.json({ error: "Invalid API key" }, 401);

  const app_id = app.id;
  const artifactId = generateId();
  const now = new Date().toISOString();
  let version!: number;

  await db.transaction(async (tx) => {
    const latest = await tx
      .select({ max: sql<number>`MAX(version)` })
      .from(artifactsTable)
      .where(eq(artifactsTable.app_id, app_id))
      .get();

    version = (latest?.max ?? 0) + 1;

    await tx.insert(artifactsTable).values({
      id: artifactId,
      app_id,
      version,
      status: "uploading",
      created_at: now,
      updated_at: now
    });
  });

  return c.json({
    data: {
      id: artifactId,
      version,
      upload_url: `/artifacts/${artifactId}/upload`
    }
  });
});

/**
 * Upload artifact via multipart/form-data
 */
artifactsRouter.post("/:artifactId/upload", async (c) => {
  try {
    const artifactId = c.req.param("artifactId");
    fs.ensureDirSync(ARTIFACT_ROOT);
    fs.ensureDirSync(TEMP_DIR);
    // validate artifact exists
    const artifact = await db
      .select()
      .from(artifactsTable)
      .where(eq(artifactsTable.id, artifactId))
      .get();

    if (!artifact) return c.json({ error: "Artifact not found" }, 404);

    // parse multipart/form-data
    const body = await c.req.parseBody();
    console.log("Received body: ");
    const file = body["artifact"];
    console.log("file" + file);
    console.log("filetype " + typeof file);
    // if (!file || !(file instanceof File)) {
    //   return c.json({ error: "No file uploaded" }, 400);
    // }

    // save to temp as .tar.gz
    const tempPath = path.join(TEMP_DIR, `${artifactId}.tar.gz`);
    const finalDir = path.join(ARTIFACT_ROOT, artifactId);
    fs.ensureDirSync(finalDir);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempPath, Buffer.from(arrayBuffer));

    // extract and cleanup
    console.log({ tempPath, finalDir });
    await tar.extract({ file: tempPath, cwd: finalDir });

    await fs.unlink(tempPath);

    // update artifact status
    await db
      .update(artifactsTable)
      .set({ status: "ready", updated_at: new Date().toISOString() })
      .where(eq(artifactsTable.id, artifactId))
      .run();
    console.log("Artifact uploaded and extracted successfully");
    return c.json({
      message: "Upload and extraction complete",
      path: finalDir
    });
  } catch (error) {
    console.error("Error uploading artifact:", error);
    return c.json({ error: "Failed to upload artifact" }, 500);
  }
});
