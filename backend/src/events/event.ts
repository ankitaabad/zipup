import { fs } from "fs";
import EventEmitter from "events";
import { eq } from "drizzle-orm";
import { getLogger } from "@backend/utils/logger";
import { generateId, getArtifactStorageLocation } from "@backend/utils/helper";
import { updateRouteConfig } from "@backend/utils/routeConfig";
import { db } from "@backend/db/dbClient";
import {
  deployDynamicApp,
  removeAllContainersOfAnApp
} from "@backend/utils/docker_utils";
import {
  appsTable,
  artifactsTable,
  deploymentsTable
} from "@backend/db/schema";

export const eventBus = new EventEmitter();
export const reverseProxyURL = "http://openresty:8080";
export const zipupEvents = {
  "app_deployed": "app_deployed",
  "artifact_uploaded": "artifact_uploaded",
  "app_delete_initiated": "app_deleted_initiated",
  "app_stop_initiated": "app_stop_initiated",
  "deploy_latest_app": "deploy_latest_app"
};
eventBus.on("deploy_latest_app", async (event: { app_id: string }) => {
  try {
    const logger = getLogger();
    logger.debug("deploy latest app event received ");
    // get latest deployment info of the app
    const { app_id } = event;
    //get app
    const app = await db
      .select()
      .from(appsTable)
      .where(eq(appsTable.id, app_id))
      .get();
    if (!app) {
      logger.error(`App with id ${app_id} not found`);
      return;
    }
    //todo: we can optimize this query by directly joining the tables instead of making multiple calls to db
    const latestDeployment = await db
      .select()
      .from(deploymentsTable)
      .where(eq(deploymentsTable.app_id, app_id))
      .orderBy(deploymentsTable.created_at, "desc")
      .limit(1)
      .get();

    if (!latestDeployment) {
      logger.error(`No deployments found for app_id: ${app_id}`);
      return;
    }
    const artifact = await db
      .select()
      .from(artifactsTable)
      .where(eq(artifactsTable.id, latestDeployment.artifact_id))
      .get();
    if (!artifact) {
      logger.error(
        `Artifact with id ${latestDeployment.artifact_id} not found`
      );
      return;
    }
    // trigger redeployment of the latest artifact
    eventBus.emit(zipupEvents.artifact_uploaded, {
      artifact_id: artifact.id,
      app_id,
      type: "DYNAMIC",
      version: artifact.version,
      internal_port: 3000,
      start_command: app.start_command,
      app_name: app.name
    });
  } catch (error) {}
});
eventBus.on(
  zipupEvents.app_stop_initiated,
  async (event: { app_id: string }) => {
    try {
      const logger = getLogger();
      logger.debug("app stop initiated event received ");
      logger.debug(JSON.stringify(event));
      const { app_id } = event;
      // get containers related to the app and stop them
      await removeAllContainersOfAnApp(app_id);
    } catch (error) {
      console.error("Error stopping app:", error);
    }
  }
);
eventBus.on(
  zipupEvents.app_delete_initiated,
  async (event: { app_id: string }) => {
    try {
      const logger = getLogger();
      logger.debug("app delete initiated event received ");
      logger.debug(JSON.stringify(event));
      const { app_id } = event;
      const app = await db
        .select()
        .from(appsTable)
        .where(eq(appsTable.id, app_id))
        .get();
      if (!app) {
        logger.error(`App with id ${app_id} not found`);
        return;
      }
      if (app.type === "DYNAMIC") {
        await removeAllContainersOfAnApp(app_id);
      }
      if (!app) {
        logger.error(`App with id ${app_id} not found`);
        return;
      }
      // remove all artifcats related to the app from storage and then db
      const artifacts = await db
        .select()
        .from(artifactsTable)
        .where(eq(artifactsTable.app_id, app_id));
      await Promise.all(
        artifacts.map(async (artifact) => {
          const artifactPath = getArtifactStorageLocation(
            app.type,
            artifact.id
          );

          logger.debug(`Removing artifact at path: ${artifactPath}`);
          await removeArtifactFromStorage(artifactPath);
        })
      );
      await db.delete(appsTable).where(eq(appsTable.id, app_id));
    } catch (error) {
      console.error("Error deleting app artifacts:", error);
    }
  }
);
const removeArtifactFromStorage = async (artifactLocation: string) => {
  await fs.unlink(artifactLocation);
};
eventBus.on(
  zipupEvents.artifact_uploaded,
  async (event: {
    artifact_id: string;
    app_id: string;
    type: "STATIC" | "DYNAMIC";
    version: string;
    internal_port: number;
    start_command: string;
    app_name: string;
  }) => {
    try {
      const logger = getLogger();
      logger.debug("artifact uploaded event received ");
      logger.debug(JSON.stringify(event));
      // get artifact info
      const {
        app_id,
        version,
        artifact_id,
        type,
        start_command,
        internal_port,
        app_name
      } = event;

      // create entry in deployment
      const now = new Date().toISOString();
      const deploymentId = generateId();
      const result = await db.insert(deploymentsTable).values({
        app_id,
        artifact_id,
        status: "IN_PROGRESS",
        id: deploymentId,
        created_at: now,
        updated_at: now,
        version,
        container_name: `zipup_${app_id}_${deploymentId.slice(-8)}`
      });
      if (type === "STATIC") {
        // static deployment
        logger.debug("reloading the config");
        // await updateRouteConfig();
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
            status: "SUCCESS",
            updated_at: now
          })
          .where(eq(deploymentsTable.id, deploymentId));
      } else if (type === "DYNAMIC") {
        await deployDynamicApp({
          deployment_id: deploymentId,
          artifact_id,
          app_id,
          app_name,
          start_command,
          internal_port: 3000
        });
      }
    } catch (error) {
      console.error("Error deploying artifact:", error);
    }
  }
);
