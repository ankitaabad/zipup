// what we need to create docker container

/**
 * docker image : node:24-alpine
 * volume: /app and /data
 *
 * secrets
 * user defined envs
 * system provided envs redis prefix, username, password
 * deployment port
 * networks(redis and openresty upstream connection)
 * container name with some suffix
 * set labels like artifact_id deployment_id, app name etc
 * the latest deployment will decide the value from the latest upstream.
 * set working directoryto /app
 * start command
 * clean up logic
 */

import Docker from "dockerode";
import { db } from "../../utils";
import {
  appsTable,
  artifactsTable,
  deploymentsTable,
  envVarsTable,
  portsTable,
  secretsTable
} from "../db/schema";
import { eq } from "drizzle-orm";
import { getLogger } from "./logger";
import { updateRouteConfig } from "./routeConfig";
import { portForUserApps } from "./constants";
var docker = new Docker({ socketPath: "/var/run/docker.sock" });
export const reverseProxyURL = "http://openresty:8080";

async function createDynamicApp(deploymentId: string) {
  const deployment = await db
    .select()
    .from(deploymentsTable)
    .leftJoin(appsTable, eq(deploymentsTable.app_id, appsTable.id))
    .leftJoin(
      artifactsTable,
      eq(deploymentsTable.artifact_id, artifactsTable.id)
    )
    .where(eq(deploymentsTable.id, deploymentId));
}

export async function deployDynamicApp(event: {
  deployment_id: string;
  artifact_id: string;
  app_id: string;
  start_command: string;
  internal_port: number;
}) {
  try {
    const logger = getLogger();
    const { deployment_id, artifact_id, app_id, internal_port, start_command } =
      event;
    logger.debug(`start command ${start_command}`);
    // get free port and reserve it
    let port: number;
    await db.transaction(async (tx) => {
      const ports = await tx
        .select()
        .from(portsTable)
        .where(eq(portsTable.status, "AVAILABLE"))
        .limit(1);
      port = ports[0]?.port;
      if (!port) {
        throw new Error("No free port found");
      }
      await tx
        .update(portsTable)
        .set({
          status: "RESERVED",
          deployment_id: event.deployment_id
        })
        .where(eq(portsTable.port, port));
    });
    if (!port) {
      logger.error("No free port found");
      return;
    }
    const [env_vars, secrets] = await Promise.all([
      db
        .select()
        .from(envVarsTable)
        .where(eq(envVarsTable.app_id, event.app_id)),
      db
        .select()
        .from(secretsTable)
        .where(eq(secretsTable.app_id, event.app_id))
    ]);
    const envs: Record<string, string> = {};
    for (const env of env_vars) {
      envs[env.key] = env.value;
    }
    for (const secret of secrets) {
      envs[secret.key] = secret.value;
    }

    // create volumes if doesnot exist
    const volumes = await docker.listVolumes();
    // await docker.createVolume({
    //   Name: `app_${app_id}_${deployment_id.slice(-8)}`
    // });
    const dataVolumeName = `data_${app_id}`;
    const appVolumeName = `app_${app_id}_${deployment_id.slice(-8)}`;
    // await docker.createVolume({
    //   Name: appVolumeName
    // });
    // copy data from dynamic artifact to appVolume

    const isDataVolumeExists = volumes.Volumes.some((vol) => {
      return vol.Name === dataVolumeName;
    });
    if (!isDataVolumeExists) {
      await docker.createVolume({
        Name: dataVolumeName
      });
    }
    const containerName = `passup_${app_id}_${deployment_id.slice(-8)}`;
    logger.debug(`creating container ${containerName}`);
    //wait 8 seconds
    // await new Promise((resolve) => setTimeout(resolve, 8000));
    logger.debug("wait complete, proceeding to create container");
    const container = await docker.createContainer({
      Image: "node:24-alpine",
      name: containerName,

      Cmd: ["sh", "-c", start_command],

      Env: [
        `PORT=${portForUserApps}`,
        ...Object.entries(envs).map(([k, v]) => `${k}=${v}`)
      ],

      ExposedPorts: {
        [`${portForUserApps}/tcp`]: {}
      },
      NetworkingConfig: {
        EndpointsConfig: {
          passup_redis_network: {},
          passup_openresty_network: {}
        }
      },
      WorkingDir: `/app/${artifact_id}`,
      HostConfig: {
        // PortBindings: {
        //   [`${internal_port}/tcp`]: [{ HostPort: port?.toString() }]
        // },
        Mounts: [
          {
            Type: "volume",
            // todo: any better approach instead of mounting whole volume
            Source: "passup_dynamic_artifacts",
            Target: "/app",
            ReadOnly: true
            // VolumeOptions: {
            //   Subpath: artifact_id
            // }
          },
          {
            Type: "volume",
            Source: dataVolumeName,
            Target: "/data",
            ReadOnly: false
          }
        ],
        // Binds: [`artifact_${artifact_id}:/app:ro`, `data_${app_id}:/data`],
        RestartPolicy: { Name: "unless-stopped" }
      },

      Labels: {
        "passup.app_id": app_id,
        "passup.deployment_id": deployment_id,
        "passup.artifact_id": artifact_id
      }
    });
    logger.debug("container created successfully.");
    // if (!container) {
    //   logger.error("Error creating container");
    //   return;
    // }
    await container.start();
    logger.debug("container started successfully.");
    logger.debug("updating port status");
    // make port active
    await db
      .update(portsTable)
      .set({
        status: "ACITVE",
        allocated_at: new Date().toISOString()
      })
      .where(eq(portsTable.port, port));

    logger.debug("port status updated to active successfully.");
    // check if the container is in running state
    await db.update(deploymentsTable).set({
      status: "SUCCESS",
      host_port: port,
      container_name: containerName,
      updated_at: new Date().toISOString()
    });
    await updateRouteConfig();
    await fetch(`${reverseProxyURL}/__reload__`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });
    //todo: remove existing container
  } catch (error) {
    console.error("Error deploying artifact:", error);
  }
}
