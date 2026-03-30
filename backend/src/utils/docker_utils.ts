import { generateKeyPairSync, randomBytes } from "node:crypto";
// what we need to create docker container

/**
 * docker image : node:20-bookworm-slim
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
import {
  appsTable,
  artifactsTable,
  deploymentsTable,
  envVarsTable,
  secretsTable
} from "../db/schema";
import { eq } from "drizzle-orm";
import { getLogger } from "./logger";
import { updateRouteConfig } from "./routeConfig";
import { PORT_FOR_USER_APPS, reverseProxyURL } from "./constants";
import { db } from "@backend/db/dbClient";
import { mkdir, writeFile } from "fs/promises";
import { buildWireguardConfig, initiateRouteReload } from "./helper";
import { DEPLOYMENT_STATUS } from "@common/index";
import { PassThrough } from "node:stream";
var docker = new Docker({ socketPath: "/var/run/docker.sock" });

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
  app_name: string;
}) {
  let container: Docker.Container;
  try {
    const logger = getLogger();
    const {
      deployment_id,
      artifact_id,
      app_id,
      internal_port,
      start_command,
      app_name
    } = event;
    logger.debug(`start command ${start_command}`);

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
    const containerName = `zipup_${app_id}_${deployment_id.slice(-8)}`;
    logger.debug(`creating container ${containerName}`);
    //wait 8 seconds
    // await new Promise((resolve) => setTimeout(resolve, 8000));
    logger.debug("wait complete, proceeding to create container");
    container = await docker.createContainer({
      Image: "node:24-bookworm-slim",
      name: containerName,

      Cmd: ["sh", "-c", start_command],

      Env: [
        ...Object.entries(envs).map(([k, v]) => `${k}=${v}`),
        `ZIPUP_PORT=${PORT_FOR_USER_APPS}`
      ],

      ExposedPorts: {
        [`${PORT_FOR_USER_APPS}/tcp`]: {}
      },
      NetworkingConfig: {
        EndpointsConfig: {
          zipup_core_network: {},
          zipup_edge_network: {}
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
            Source: "zipup_dynamic_artifacts",
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
        "zipup.app_id": app_id,
        "zipup.deployment_id": deployment_id,
        "zipup.artifact_id": artifact_id,
        "appType": "user",
        "appName": app_name
      }
    });
    logger.debug("container created successfully.");
    // if (!container) {
    //   logger.error("Error creating container");
    //   return;
    // }
    await container.start();

    logger.debug("container started successfully.");
    // ----- container has been started -----
    const startupTimeoutMs = 8000; // wait up to 8 seconds for container to be stable
    const pollIntervalMs = 1000;
    let elapsed = 0;
    let runningCount = 0;
    // Poll container state
    while (elapsed < startupTimeoutMs) {
      const info = await container.inspect();
      // Check if container exited or dead immediately
      if (info.State.Status === "exited" || info.State.Status === "dead") {
        throw new Error(
          `Container ${containerName} failed to start. ExitCode: ${info.State.ExitCode}`
        );
      }

      logger.info(`Restart count: ${info.RestartCount}`);
      // Check for early restart (crash-loop)
      if (info.RestartCount > 0) {
        throw new Error(`Container ${containerName} restarted during startup`);
      }
      if (info.State.Running === true) {
        logger.info(`runningCount: ${runningCount}`);
        runningCount++;
        if (runningCount > 2) {
          break;
        }
      }

      // Still running? wait next poll
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      elapsed += pollIntervalMs;
    }

    logger.info(
      `Container ${containerName} is running after ${startupTimeoutMs / 1000}s`
    );

    // -----------------------------
    // Update config / route traffic
    // -----------------------------
    // Your app-specific logic to update config, reverse proxy, or route traffic
    // e.g., update openresty or nginx upstream to point to this container
    // await updateRouteConfig();
    await initiateRouteReload();
    // update deployment status
    await db
      .update(deploymentsTable)
      .set({
        status: "SUCCESS",
        updated_at: new Date().toISOString()
      })
      .where(eq(deploymentsTable.id, deployment_id));
    // ----------------------------------------
    // Stop and remove old containers for same app
    // ----------------------------------------
    const existingContainers = await docker.listContainers({
      all: true,
      filters: { label: [`zipup.app_id=${app_id}`] }
    });
    const existingContainerNames = existingContainers.map((c) => c.Names[0]);
    logger.info("Existing container names:", existingContainerNames);
    logger.info("NEw containe Name: ", `${containerName}`);
    for (const c of existingContainers) {
      // skip the new container
      logger.debug(`container names: ${c.Names}`);
      if (c.Names.includes(`/${containerName}`)) continue;

      const oldContainer = docker.getContainer(c.Id);
      logger.info(`Stopping old container ${c.Names[0]}`);

      try {
        await oldContainer.stop({ t: 5 }); // graceful stop
      } catch (err) {
        console.warn(`Error stopping container ${c.Names[0]}: ${err.message}`);
      }

      try {
        await oldContainer.remove({ force: true });
        logger.info(`Removed old container ${c.Names[0]}`);
      } catch (err) {
        logger.warn(`Error removing container ${c.Names[0]}: ${err.message}`);
      }
    }

    logger.info("Old containers cleaned up, deployment complete.");
  } catch (error) {
    console.error("Error deploying artifact:", error);
    try {
      // get container logs
      if (container) {
        logger.info("container exists");
      } else {
        logger.info("container does not exist");
      }
      let logs;
      if (container) {
        logs = await getMergedContainerLogs(container);
      }
      await db
        .update(deploymentsTable)
        .set({
          status: DEPLOYMENT_STATUS.FAILED,
          updated_at: Date.now().toString(),
          failureLogs: logs || ""
        })
        .where(eq(deploymentsTable.id, event.deployment_id));
      if (container) {
        try {
          logger.info("removing container.");
          await container.stop();
          await container?.remove();
        } catch (error) {
          console.error("Error removing container:", error);
        }
      }
    } catch (error) {
      console.error("Error updating deployment status:", error);
    }
  }
}
async function getMergedContainerLogs(container) {
  const buffer = await container.logs({
    stdout: true,
    stderr: true,
    follow: false,
    timestamps: false
  });

  let offset = 0;
  let result = "";

  while (offset < buffer.length) {
    const streamType = buffer[offset]; // 1 = stdout, 2 = stderr
    const length = buffer.readUInt32BE(offset + 4);

    const content = buffer.slice(offset + 8, offset + 8 + length);

    result += content.toString("utf-8");

    offset += 8 + length;
  }

  return result;
}
export async function getDockerStats() {
  try {
    // Fetch all containers
    const logger = getLogger();
    const containers = await docker.listContainers({ all: false });
    // Prepare stats promises
    const statsPromises = containers.map(async (containerInfo) => {
      const container = docker.getContainer(containerInfo.Id);
      // Fetch live stats (non-streaming)
      const statsStream = await container.stats({ stream: false });
      // statsStream.memory_stats, cpu_stats, networks, etc.
      // Calculate CPU %
      const cpuDelta =
        statsStream.cpu_stats.cpu_usage.total_usage -
        statsStream.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        statsStream.cpu_stats.system_cpu_usage -
        statsStream.precpu_stats.system_cpu_usage;
      let cpuPercent = 0;
      if (systemDelta > 0 && cpuDelta > 0) {
        cpuPercent =
          (cpuDelta / systemDelta) * statsStream.cpu_stats.online_cpus * 100;
      }

      // Memory usage
      const memoryUsage = statsStream.memory_stats.usage || 0;
      const memoryLimit = statsStream.memory_stats.limit || 1;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      // Network I/O
      const networks = statsStream.networks || {};
      let networkRx = 0,
        networkTx = 0;
      Object.values(networks).forEach((net: any) => {
        networkRx += net.rx_bytes || 0;
        networkTx += net.tx_bytes || 0;
      });

      // Labels to distinguish app type
      const labels = containerInfo.Labels || {};

      const appName = labels["appName"] || containerInfo.Names[0];
      const appType = labels["appType"] || "user";
      const instance = labels["zipup.deployment_id"] || "1";

      return {
        id: containerInfo.Id,
        name: containerInfo.Names[0].replace("/", ""),
        appName,
        appType,
        instance,
        cpuPercent: parseFloat(cpuPercent.toFixed(2)),
        memoryUsage,
        memoryLimit,
        memoryPercent: parseFloat(memoryPercent.toFixed(2)),
        networkRx,
        networkTx
      };
    });

    const stats = await Promise.all(statsPromises);

    return stats;
  } catch (err) {
    console.error(err);
    // throw err;
  }
}

export const isAppRunningByAppId = async (appId: string) => {
  const containers = await docker.listContainers({ all: false });
  return containers.some((c) => {
    const labels = c.Labels || {};
    return labels["zipup.app_id"] === appId && c.State === "running";
  });
};
export const removeAllContainersOfAnApp = async (appId: string) => {
  const logger = getLogger();
  const containers = await docker.listContainers({ all: true });
  const targetContainers = containers.filter((c) => {
    const labels = c.Labels || {};
    return labels["zipup.app_id"] === appId;
  });

  for (const c of targetContainers) {
    const container = docker.getContainer(c.Id);
    try {
      if (c.State === "running") {
        await container.stop({ t: 5 });
      }
      await container.remove({ force: true });
      logger.info(`Removed container ${c.Names[0]} for app ${appId}`);
    } catch (err) {
      console.warn(
        `Error stopping/removing container ${c.Names[0]} for app ${appId}: ${err.message}`
      );
    }
  }
};

export async function execInWireguard(cmd: string[]) {
  const container = docker.getContainer("wireguard");

  if (!container) {
    throw new Error("Wireguard container not found");
  }

  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true
  });

  const stream = await exec.start({});

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];

  container.modem.demuxStream(
    stream,
    {
      write: (chunk: Buffer) => stdout.push(chunk)
    },
    {
      write: (chunk: Buffer) => stderr.push(chunk)
    }
  );

  await new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const err = Buffer.concat(stderr).toString();
  if (err) throw new Error(err);

  return Buffer.concat(stdout).toString().trim();
}
const WG_DIR = "/config/wg_confs";
const WG_CONFIG_PATH = "/config/wg_confs/wg0.conf";
export async function rebuildAndRestartWireguard() {
  const logger = getLogger();
  const config = await buildWireguardConfig();
  await mkdir(WG_DIR, { recursive: true });
  await writeFile(WG_CONFIG_PATH, config, "utf8");

  // 3. Restart inside container
  await execInWireguard(["sh", "-c", "ip link delete wg0 2>/dev/null || true"]);

  await execInWireguard(["wg-quick", "up", "wg0"]);
  // Apply config to running interface
  // await execInWireguard(["wg", "syncconf", "wg0", WG_CONFIG_PATH]);
  // await execInWireguard(["wg-quick", "syncconf", "wg0", WG_CONFIG_PATH]);

  logger.info("WireGuard config reloaded");
}
// export async function generateWireguardKeys() {
//   const privateKey = await execInWireguard(["sh", "-c", "wg genkey"]);

//   const publicKey = await execInWireguard([
//     "sh",
//     "-c",
//     `echo ${privateKey} | wg pubkey`
//   ]);

//   return {
//     privateKey,
//     publicKey
//   };
// }

type WireguardKeys = {
  privateKey: string;
  publicKey: string;
  presharedKey: string;
};

export function generateWireguardKeys(): WireguardKeys {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");

  // Extract 32 byte private key
  const rawPrivate = privateKey.export({
    type: "pkcs8",
    format: "der"
  });

  const wgPrivate = rawPrivate.slice(-32).toString("base64");

  // Extract 32 byte public key
  const rawPublic = publicKey.export({
    type: "spki",
    format: "der"
  });

  const wgPublic = rawPublic.slice(-32).toString("base64");

  // WireGuard preshared key = 32 random bytes
  const presharedKey = randomBytes(32).toString("base64");

  return {
    privateKey: wgPrivate,
    publicKey: wgPublic,
    presharedKey
  };
}
