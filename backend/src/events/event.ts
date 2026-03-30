import { fs } from "fs";
import EventEmitter from "events";
import { desc, eq } from "drizzle-orm";
import { appLogger, getLogger } from "@backend/utils/logger";
import {
  asyncLocalStorage,
  generateId,
  getArtifactStorageLocation,
  initiateRouteReload
} from "@backend/utils/helper";
import { db } from "@backend/db/dbClient";
import {
  deployDynamicApp,
  generateWireguardKeys,
  removeAllContainersOfAnApp
} from "@backend/utils/docker_utils";
import {
  appsTable,
  artifactsTable,
  deploymentsTable,
  wireguardPeersTable,
  WireguardPeerStatus,
  WireguardPeerType
} from "@backend/db/schema";
import { mkdir, writeFile } from "fs/promises";
import { DEPLOYMENT_STATUS } from "@common/index";

const eventBus = new EventEmitter();
// export const zipupEvents = {
//   "app_deployed": "app_deployed",
//   "artifact_uploaded": "artifact_uploaded",
//   "app_delete_initiated": "app_deleted_initiated",
//   "app_stop_initiated": "app_stop_initiated",
//   "deploy_latest_app": "deploy_latest_app",
//   "create_wireguard_peer": "create_wireguard_peer",
//   "update_wireguard_config": "update_wireguard_config"
// };

export type EventMap = {
  "update_wireguard_config": {}; // no payload

  "create_wireguard_peer": {
    id: string;
    type: WireguardPeerType;
    ip_index: number;
  };

  "deploy_latest_app": {
    app_id: string;
  };

  "app_stop_initiated": {
    app_id: string;
  };

  "app_delete_initiated": {
    app_id: string;
  };

  "artifact_uploaded": {
    artifact_id: string;
    app_id: string;
    type: "STATIC" | "DYNAMIC";
    version: number;
    start_command: string;
    deployment_id: string;
    app_name: string;
  };

  "app_deployed": {
    app_id: string;
    deployment_id: string;
    status: string; // or DEPLOYMENT_STATUS if you want tighter typing
  };
};

export type AppEvent<K extends keyof EventMap> = {
  name: K;
  payload: EventMap[K];
  metadata: {
    requestId?: string;
  };
};
export const emitEvent = <K extends keyof EventMap>(
  name: K,
  payload: EventMap[K]
) => {
  const logger = getLogger();
  const requestId = logger.context.requestId || generateId();

  eventBus.emit(name, {
    payload,
    metadata: {
      requestId
    }
  });
};
export const onEvent = <K extends keyof EventMap>(
  name: K,
  handler: (event: AppEvent<K>["payload"]) => void | Promise<void>
) => {
  eventBus.on(name, (event: AppEvent<K>) => {
    const { metadata, payload } = event;

    const logger = appLogger.child({
      requestId: metadata.requestId,
      eventName: name
    });

    asyncLocalStorage.run({ logger }, async () => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error("Event handler failed", { err });
      }
    });
  });
};
onEvent("app_delete_initiated", async (event) => {
  const logger = getLogger();
  logger.debug(
    "app delete initiated event received  in the asyncstorage event type"
  );

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
      const artifactPath = getArtifactStorageLocation(app.type, artifact.id);

      logger.debug(`Removing artifact at path: ${artifactPath}`);
      await removeArtifactFromStorage(artifactPath);
    })
  );
  await db.delete(appsTable).where(eq(appsTable.id, app_id));
});
onEvent("update_wireguard_config", async () => {
  const logger = getLogger();
  logger.info("Updating wireguard config");
  const WG_DIR = "/etc/wireguard";
  const WG_CONFIG_PATH = `/etc/wireguard/wg0.conf`;

  const peers = await db.select().from(wireguardPeersTable);

  const server = peers.find((p) => p.type === WireguardPeerType.SERVER);

  if (!server) {
    throw new Error("WireGuard server not found");
  }

  let config = `[Interface]
PrivateKey = ${server.private_key}
Address = 10.13.13.1/24
ListenPort = 51820

PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o eth+ -j MASQUERADE

`;

  for (const peer of peers) {
    if (
      peer.type === WireguardPeerType.CLIENT &&
      peer.public_key &&
      peer.ip_index
    ) {
      const ip = `10.13.13.${peer.ip_index}`;

      config += `[Peer]
# ${peer.name ?? `peer_${peer.id}`}
PublicKey = ${peer.public_key}
${peer.preshared_key ? `PresharedKey = ${peer.preshared_key}` : ""}
AllowedIPs = ${ip}/32
PersistentKeepalive = 25

`;
    }
  }

  await mkdir(WG_DIR, { recursive: true });
  await writeFile(WG_CONFIG_PATH, config, "utf8");
  logger.info("Wireguard config successfully updated");
});

onEvent(
  "create_wireguard_peer",
  async (event: { id: string; type: WireguardPeerType; ip_index: number }) => {
    const logger = getLogger();
    logger.info("creating new wireguard peer");
    // todo: generate public and private keys  for the peer
    const { id, type, ip_index } = event;
    // update the peer status to active after keys are generated
    const { publicKey, privateKey, presharedKey } =
      await generateWireguardKeys();
    await db
      .update(wireguardPeersTable)
      .set({
        status: WireguardPeerStatus.ACTIVE,
        public_key: publicKey,
        private_key: privateKey,
        preshared_key: presharedKey,
        ip_index,
        updated_at: new Date().toISOString()
      })
      .where(eq(wireguardPeersTable.id, id));
    logger.info("successfully updated the keys in the table.")
    emitEvent("update_wireguard_config", {});
  }
);

onEvent("deploy_latest_app", async (event: { app_id: string }) => {
  const logger = getLogger();
  logger.info("Deploying latest app");
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
    .orderBy(desc(deploymentsTable.created_at))
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
    logger.error(`Artifact with id ${latestDeployment.artifact_id} not found`);
    return;
  }
  const now = new Date().toISOString();

  const deploymentId = generateId();
  const result = await db.insert(deploymentsTable).values({
    app_id: app.id,
    artifact_id: latestDeployment.artifact_id,
    status: DEPLOYMENT_STATUS.IN_PROGRESS,
    id: deploymentId,
    created_at: now,
    updated_at: now,
    version: artifact.version,
    container_name: `zipup_${app.id}_${deploymentId.slice(-8)}`
  });
  // trigger redeployment of the latest artifact
  emitEvent("artifact_uploaded", {
    artifact_id: artifact.id,
    app_id,
    type: "DYNAMIC",
    version: artifact.version,
    start_command: app.start_command!,
    app_name: app.name,
    deployment_id: deploymentId
  });
});
onEvent("app_stop_initiated", async (event: { app_id: string }) => {
  const logger = getLogger();
  logger.debug("app stop initiated event received ");
  logger.debug(JSON.stringify(event));
  const { app_id } = event;
  // get containers related to the app and stop them
  await removeAllContainersOfAnApp(app_id);
});

const removeArtifactFromStorage = async (artifactLocation: string) => {
  await fs.unlink(artifactLocation);
};
onEvent(
  "artifact_uploaded",
  async (event: {
    artifact_id: string;
    app_id: string;
    type: "STATIC" | "DYNAMIC";
    version: number;
    start_command: string;
    deployment_id: string;
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
        app_name,
        deployment_id
      } = event;

      // create entry in deployment
      const now = new Date().toISOString();

      if (type === "STATIC") {
        // static deployment
        logger.debug("reloading the config");
        // await updateRouteConfig();
        await initiateRouteReload();
        logger.debug("route config reloaded");
        await db
          .update(deploymentsTable)
          .set({
            status: "SUCCESS",
            updated_at: now
          })
          .where(eq(deploymentsTable.id, deployment_id));
      } else if (type === "DYNAMIC") {
        await deployDynamicApp({
          deployment_id,
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
