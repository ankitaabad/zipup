import { Hono } from "hono";
import { db } from "@backend/db/dbClient";
import { artifactsTable, appsTable } from "../db/schema";
import { generateId } from "../utils/helper";
import { eq, sql } from "drizzle-orm";
import fs from "fs-extra";
import path from "path";
import * as tar from "tar";
import { eventBus, zipupEvents } from "../events/event";
import { getLogger } from "../utils/logger";
import { getArtifactWithApp } from "../utils/dbQueries";
import { BadRequest, BadSignature, errorHandler } from "../utils/errorHandler";
import {
  DYNAMIC_ARTIFACT_ROOT,
  DYNAMIC_TEMP_DIR,
  STATIC_ARTIFACT_ROOT,
  STATIC_TEMP_DIR
} from "@backend/utils/constants";
import { File } from "buffer";
import { createBodyHash, signPayload } from "@zipup/common";
import { createAppKeyAuthenticatedRouter } from "@backend/utils/middlewares";

export const artifactsRouter = createAppKeyAuthenticatedRouter();

// fs.ensureDirSync(STATIC_ARTIFACT_ROOT);
// fs.ensureDirSync(STATIC_TEMP_DIR);

/**
 * Create artifact record
 */
artifactsRouter.post("/", async (c) => {
  try {
    const logger = getLogger();
    logger.debug("creating artifact");
    const { app_key } = await c.req.json();

    const app = c.get("app");
    if (!app.start_command) {
      throw new BadRequest("App does not have a start command.");
    }
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
  } catch (error) {
    return errorHandler(c, error);
  }
});

/**
 * Upload artifact via multipart/form-data
 */
artifactsRouter.post("/:artifact_id/upload", async (c) => {
  try {
    const logger = getLogger();
    const artifact_id = c.req.param("artifact_id");
    // todo: can get app from context set by appKeyAuthMiddleware
    const bodyHashHeader = c.req.header("Zipup-Body-Hash");
    const signatureHeader = c.req.header("Zipup-Signature");
    const appKey = c.req.header("Zipup-App-Key");

    // validate artifact exists
    const artifactResult = await getArtifactWithApp(artifact_id);
    if (!artifactResult.artifact || !artifactResult.app) {
      return c.json({ error: "Artifact not found" }, 404);
    }
    const { artifact, app } = artifactResult;
    // if (!appKey || appKey !== app.app_key) {
    //   return c.json({ error: "Unauthorized" }, 401);
    // }
    const body = await c.req.parseBody();
    console.log("Received body: ", body);
    const file = body["artifact"];
    console.log("file" + file);
    console.log("filetype " + typeof file);

    const arrayBuffer = await (file as File).arrayBuffer();
    const bodyHash = createBodyHash(Buffer.from(arrayBuffer));
    if (!bodyHashHeader || bodyHashHeader !== bodyHash) {
      return c.json({ error: "Invalid body hash" }, 400);
    }
    const signature = signPayload(
      "POST",
      `/api/artifacts/${artifact_id}/upload`,
      bodyHash,
      app.secret_key
    );
    console.log({ signature });
    if (!signatureHeader || signatureHeader !== signature) {
      throw new BadSignature();
    }
    let artifactRoot: string, artifactTemp: string;
    if (app.type === "STATIC") {
      artifactRoot = STATIC_ARTIFACT_ROOT;
      artifactTemp = STATIC_TEMP_DIR;
    } else if (app?.type === "DYNAMIC") {
      artifactRoot = DYNAMIC_ARTIFACT_ROOT;
      artifactTemp = DYNAMIC_TEMP_DIR;
    } else {
      throw new BadRequest("Invalid app type");
    }
    fs.ensureDirSync(artifactRoot);
    fs.ensureDirSync(artifactTemp);
    // parse multipart/form-data

    // save to temp as .tar.gz
    const tempPath = path.join(artifactTemp, `${artifact_id}.tar.gz`);
    const finalDir = path.join(artifactRoot, artifact_id);
    fs.ensureDirSync(finalDir);

    console.log({ bodyHash });
    await fs.writeFile(tempPath, Buffer.from(arrayBuffer));

    // extract and cleanup

    // console.log({ tempPath, finalDir });
    await tar.extract({ file: tempPath, cwd: finalDir });

    await fs.unlink(tempPath);

    // update artifact status
    await db
      .update(artifactsTable)
      .set({ status: "SUCCESS", updated_at: new Date().toISOString() })
      .where(eq(artifactsTable.id, artifact_id))
      .run();
    console.log("Artifact uploaded and extracted successfully");
    //todo: use bullmq
    const eventEmitted = eventBus.emit(zipupEvents.artifact_uploaded, {
      artifact_id: artifact_id,
      app_id: app.id,
      type: app.type,
      version: artifact.version,
      start_command: app.start_command,
      app_name: app.name
    });
    logger.debug(`artifact uploaded event emitted: ${eventEmitted}`);
    return c.json({
      message: "Upload and extraction complete",
      path: finalDir
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});
