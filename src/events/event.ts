import EventEmitter from "events";
import { deploymentsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../../utils";
import { getLogger } from "../utils/logger";
import { generateId } from "../utils/helper";
import { updateRouteConfig } from "../utils/routeConfig";
import { deployDynamicApp } from "../utils/docker_utils";

export const eventBus = new EventEmitter();
export const reverseProxyURL = "http://openresty:8080";
export const paasupEvents = {
  "app_deployed": "app_deployed",
  "artifact_uploaded": "artifact_uploaded"
};

eventBus.on(
  paasupEvents.artifact_uploaded,
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
        container_name: `paasup_${app_id}_${deploymentId.slice(-8)}`
      });
      if (type === "STATIC") {
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
