import { type } from "arktype";
import { appsTable, deploymentSchema } from "./../db/schema";
import EventEmitter from "events";
import { artifactsTable, deploymentsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../utils";
import { getLogger } from "../utils/logger";
import { generateId } from "../utils/helper";
import { updateRouteConfig } from "../utils/routeConfig";

export const eventBus = new EventEmitter();
export const reverseProxyURL = "http://openresty:8080";
export const passupEvents = {
  "app_deployed": "app_deployed",
  "artifact_uploaded": "artifact_uploaded"
};

eventBus.on(
  passupEvents.artifact_uploaded,
  async (event: { artifactId: string }) => {
    try {
      console.log("artifact uploaded event received");
      const logger = getLogger();
      // get artifact info
      const artifact = await db
        .select()
        .from(artifactsTable)
        .where(eq(artifactsTable.id, event.artifactId))
        .get();
      logger.debug(JSON.stringify(artifact));

      if (!artifact) {
        console.error(`Artifact not found: ${event.artifactId}`);
        return;
      }
      const { app_id, version, id: artifact_id } = artifact;
      const app = await db
        .select()
        .from(appsTable)
        .where(eq(appsTable.id, app_id))
        .limit(1)
        .get();
      logger.debug(JSON.stringify({ app }));
      if (!app) {
        logger.error("app not found");
        return;
      }
      // create entry in deployment
      const now = new Date().toISOString();
      const deploymentId = generateId();
      const result = await db.insert(deploymentsTable).values({
        app_id,
        artifact_id,
        status: "started",
        id: deploymentId,
        created_at: now,
        updated_at: now,
        version
      });
      if (app.type === "static") {
        // static deployment
        logger.debug("reloading the config");
        await updateRouteConfig();
        await fetch(`${reverseProxyURL}/__reload__`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          }
        });
        logger.debug("route config reloaded");
        await db
          .update(deploymentsTable)
          .set({
            status: "success"
          })
          .where(eq(deploymentsTable.id, deploymentId));
      }
    } catch (error) {
      console.error("Error deploying artifact:", error);
    }
  }
);
