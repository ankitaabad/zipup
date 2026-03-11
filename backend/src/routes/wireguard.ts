import { db } from "@backend/db/dbClient";
import {
  wireguardPeersTable,
  WireguardPeerStatus,
  WireguardPeerType
} from "@backend/db/schema";
import { eventBus, zipupEvents } from "@backend/events/event";
import { generateId, getServerAddress } from "@backend/utils/helper";
import { getLogger } from "@backend/utils/logger";
import { createAuthenticatedRouter } from "@backend/utils/middlewares";
import { CreatePeerSchema } from "@zipup/common";
import { and, asc, desc, eq } from "drizzle-orm";

export const wireguardRouter = createAuthenticatedRouter();

wireguardRouter.post("/peers", async (c) => {
  const logger = getLogger();
  const { name, description } = CreatePeerSchema.parse(await c.req.json());
  const peerId = generateId();
  const now = new Date().toISOString();
  // fetch the latest ip_index from the table and find first non used ip_index starting from 2 (1 is reserved for server)
  let availableIpIndex: number | undefined;
  const usedPeers = await db
    .select({ ip_index: wireguardPeersTable.ip_index })
    .from(wireguardPeersTable);
  const indexSet = new Set<number>(usedPeers.map((p) => p.ip_index!));
  for (let i = 2; i < 255; i++) {
    if (!indexSet.has(i)) {
      availableIpIndex = i;
      break;
    }
  }
  if (!availableIpIndex) {
    logger.error("No available IP index for new Wireguard peer");
    return c.json({ error: "Maximum number of peers reached" }, 400);
  }
  await db.insert(wireguardPeersTable).values({
    id: peerId,
    name,
    description,
    ip_index: availableIpIndex,
    type: WireguardPeerType.CLIENT,
    status: WireguardPeerStatus.IN_PROGRESS,
    created_at: now,
    updated_at: now
  });
  logger.debug("Created new Wireguard peer", { peerId, name });
  eventBus.emit(zipupEvents.create_wireguard_peer, {
    id: peerId,
    type: WireguardPeerType.CLIENT,
    ip_index: availableIpIndex
  });
  return c.json({
    data: {
      id: peerId,
      name,
      description,
      status: WireguardPeerStatus.IN_PROGRESS
    },
    message:
      "Peer creation initiated. It may take a moment for the peer to become active."
  });
});

wireguardRouter.get("/peers", async (c) => {
  const logger = getLogger();
  const peers = await db
    .select()
    .from(wireguardPeersTable)
    .where(eq(wireguardPeersTable.type, WireguardPeerType.CLIENT))
    .orderBy(asc(wireguardPeersTable.name));
  const response = peers.map((peer) => ({
    id: peer.id,
    name: peer.name,
    description: peer.description,
    status: peer.status,
    ip_index: peer.ip_index,
    created_at: peer.created_at
  }));
  logger.debug("Fetched Wireguard peers", { count: response.length });
  return c.json({ data: response });
});

wireguardRouter.get("/peers/:id", async (c) => {
  const logger = getLogger();
  const peerId = c.req.param("id");
  const peer = await db
    .select()
    .from(wireguardPeersTable)
    .where(
      and(
        eq(wireguardPeersTable.id, peerId),
        eq(wireguardPeersTable.type, WireguardPeerType.CLIENT)
      )
    )
    .get();
  if (!peer) {
    logger.warn("Wireguard peer not found", { peerId });
    return c.json({ error: "Peer not found" }, 404);
  }
  logger.debug("Fetched Wireguard peer details", { peerId });
  return c.json({ data: peer });
});

wireguardRouter.delete("/peers/:id", async (c) => {
  const logger = getLogger();
  const peerId = c.req.param("id");
  const deleted = await db
    .delete(wireguardPeersTable)
    .where(
      and(
        eq(wireguardPeersTable.id, peerId),
        eq(wireguardPeersTable.type, WireguardPeerType.CLIENT)
      )
    )
    .run();
  if (deleted.rowsAffected === 0) {
    logger.warn("Attempted to delete non-existent Wireguard peer", { peerId });
    return c.json({ error: "Peer not found" }, 404);
  }
  logger.debug("Deleted Wireguard peer", { peerId });
  eventBus.emit(zipupEvents.update_wireguard_config);
  return c.json({ message: "Peer deleted" });
});

// get server peer details
wireguardRouter.get("/server", async (c) => {
  const logger = getLogger();
  const serverPeer = await db
    .select()
    .from(wireguardPeersTable)
    .where(eq(wireguardPeersTable.type, WireguardPeerType.SERVER))
    .get();
  if (!serverPeer) {
    logger.error("Server Wireguard peer not found");
    return c.json({ error: "Server peer not found" }, 404);
  }
  logger.debug("Fetched Wireguard server peer details");
  return c.json({ data: serverPeer });
});

wireguardRouter.get("/peers/:id/config", async (c) => {
  const logger = getLogger();
  const peerId = c.req.param("id");

  const peer = await db
    .select()
    .from(wireguardPeersTable)
    .where(
      and(
        eq(wireguardPeersTable.id, peerId),
        eq(wireguardPeersTable.type, WireguardPeerType.CLIENT)
      )
    )
    .get();

  if (!peer) {
    logger.warn("Wireguard peer not found for config generation", { peerId });
    return c.json({ error: "Peer not found" }, 404);
  }

  if (peer.status !== WireguardPeerStatus.ACTIVE) {
    logger.warn("Attempted to generate config for non-active Wireguard peer", {
      peerId,
      status: peer.status
    });

    return c.json(
      { error: "Peer is not active yet. Please wait a moment and try again." },
      400
    );
  }

  const serverPeer = await db
    .select()
    .from(wireguardPeersTable)
    .where(eq(wireguardPeersTable.type, WireguardPeerType.SERVER))
    .get();

  if (!serverPeer) {
    logger.error("Server Wireguard peer not found for config generation");
    return c.json({ error: "Server peer not found" }, 404);
  }

  const serverAddress = await getServerAddress();

  const endpoint = `${serverAddress || "YOUR_SERVER_DOMAIN"}:51820`;
  const dns = process.env.WIREGUARD_DNS || "1.1.1.1";

  const clientIp = `10.13.13.${peer.ip_index}`;

  const config = [
    `[Interface]`,
    `PrivateKey = ${peer.private_key}`,
    `Address = ${clientIp}/24`,
    `ListenPort = 51820`,
    ``,
    `[Peer]`,
    `# Zipup WireGuard Server`,
    `PublicKey = ${serverPeer.public_key}`,
    peer.preshared_key ? `PresharedKey = ${peer.preshared_key}` : "",
    `Endpoint = ${endpoint}`,
    `AllowedIPs = 172.25.0.0/24`,
    `PersistentKeepalive = 25`
  ]
    .filter(Boolean)
    .join("\n");

  logger.debug("Generated Wireguard config for peer", { peerId });

  c.header("Content-Type", "text/plain");
  c.header("Content-Disposition", `attachment; filename="${peer.name}.conf"`);

  return c.text(config);
});
