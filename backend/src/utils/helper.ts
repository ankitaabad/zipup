import KSUID from "ksuid";
import { publicIpv4 } from "public-ip";
import { hash, verify } from "@node-rs/argon2";
import { sha1 } from "@oslojs/crypto/sha1";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { V4 } from "paseto";
import {
  AUD,
  DYNAMIC_ARTIFACT_ROOT,
  DYNAMIC_TEMP_DIR,
  Environment,
  envVar,
  ISSUER,
  reverseProxyURL,
  STATIC_ARTIFACT_ROOT,
  STATIC_TEMP_DIR,
  TokenPurpose
} from "./constants";
import { BadRequest } from "./errorHandler";
import path from "path";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import {
  settingsTable,
  wireguardPeersTable,
  WireguardPeerStatus,
  WireguardPeerType
} from "@backend/db/schema";
import { db } from "@backend/db/dbClient";
import { eq } from "drizzle-orm";
import { emitEvent } from "@backend/events/event";
import { getPasetoKeys } from "./tokenKeys";
import { AsyncLocalStorage } from "async_hooks";
import { getLogger } from "./logger";
export const generateId = () => {
  return KSUID.randomSync().string;
};

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 2,
    outputLen: 32
  });
}

export async function verifyPasswordHash(
  hash: string,
  password: string
): Promise<boolean> {
  return await verify(hash, password);
}

export async function verifyPasswordStrength(
  password: string
): Promise<boolean> {
  if (password.length < 8 || password.length > 255) return false;

  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`
    );
    const data = await response.text();
    const items = data.split("\n");

    for (const item of items) {
      const [suffix] = item.split(":");
      if (hash.slice(5) === suffix.toLowerCase()) {
        return false; // password has been pwned
      }
    }
  } catch (e) {
    console.warn("Could not check pwned passwords:", e);
    // optionally allow password if API fails
  }

  return true;
}

const ACCESS_TTL = 20 * 60 * 1000; // 20 min
const REFRESH_TTL = 24 * 60 * 60 * 1000; // 1 day

export const ACCESS_AUD = "zipup_api";
export const APP_AUD = "app_access";
export const REFRESH_AUD = "token_refresh";

export type TokenPayload = {
  sub: string;
  aud: AUD;
  iss: typeof ISSUER;
  purpose: TokenPurpose;
  iat: string;
  exp: string;
};
export const generateAccessToken = async (user_id: string) => {
  const iat = new Date().toISOString();
  const exp = new Date(Date.now() + ACCESS_TTL).toISOString();
  const payload = {
    sub: user_id,
    aud: AUD.ZIPUP_API,
    iss: ISSUER,
    purpose: TokenPurpose.ACCESS,
    iat,
    exp
  };
  const pasetoKeys = await getPasetoKeys();
  return await V4.sign(payload, pasetoKeys.secretKey as string);
};
//todo: check for rigth value of aud and purpose
export const generateRefreshToken = async (user_id: string) => {
  const iat = new Date().toISOString();
  const exp = new Date(Date.now() + REFRESH_TTL).toISOString();
  const jti = generateId();
  const payload = {
    sub: user_id,
    aud: AUD.ZIPUP_API,
    iss: ISSUER,
    purpose: TokenPurpose.REFRESH,
    jti,
    iat,
    exp
  };
  storeRefreshJti(jti, exp);
  const pasetoKeys = await getPasetoKeys();

  return {
    jti,
    token: await V4.sign(payload, pasetoKeys.secretKey as string)
  };
};
export const generateCSRFToken = async (user_id: string) => {
  const iat = new Date().toISOString();
  const exp = new Date(Date.now() + ACCESS_TTL + 5000).toISOString();
  const payload = {
    sub: user_id,
    aud: AUD.ZIPUP_API,
    iss: ISSUER,
    purpose: TokenPurpose.CSRF,
    iat,
    exp
  };
  const pasetoKeys = await getPasetoKeys();

  return await V4.sign(payload, pasetoKeys.secretKey as string);
};

export type AccessTokenPayload = {
  sub: string;
  aud: typeof ACCESS_AUD;
  iss: string;
  purpose: "access";
  iat: number;
  exp: number;
};

export const verifyAccessToken = async (
  token: string
): Promise<AccessTokenPayload> => {
  const pasetoKeys = await getPasetoKeys();
  const payload = (await V4.verify(token, pasetoKeys.publicKey as string, {
    issuer: ISSUER
  })) as AccessTokenPayload;

  if (payload.aud !== AUD.ZIPUP_API) {
    throw new Error("Invalid audience");
  }
  // Ensure token purpose
  if (payload.purpose !== TokenPurpose.ACCESS) {
    throw new Error("Invalid token purpose");
  }

  // Ensure issued-at is not in the future (allow small clock drift, e.g., 30s)
  const now = Date.now();
  if (new Date(payload.iat).getTime() > now + 30_000) {
    throw new Error("Invalid issued-at (iat)");
  }

  // Ensure token is not expired
  if (new Date(payload.exp).getTime() <= now) {
    throw new Error("Access token expired");
  }

  // Ensure subject exists
  if (!payload.sub) {
    throw new Error("Missing subject (sub)");
  }

  return payload;
};

export type RefreshTokenPayload = {
  sub: string;
  aud: typeof AUD.ZIPUP_API;
  iss: string;
  purpose: "refresh";
  jti: string;
  iat: number;
  exp: number;
};

export const verifyRefreshToken = async (
  token: string
): Promise<RefreshTokenPayload> => {
  const pasetoKeys = await getPasetoKeys();
  const payload = (await V4.verify(
    token,
    pasetoKeys.publicKey
  )) as RefreshTokenPayload;
  if (payload.aud !== AUD.ZIPUP_API) {
    throw new Error("Invalid audience");
  }
  if (payload.purpose !== TokenPurpose.REFRESH) {
    throw new Error("Invalid token purpose");
  }
  if (!payload.jti) {
    throw new Error("Missing jti");
  }
  const consumed = consumeRefreshJti(payload.jti);
  if (!consumed) {
    throw new Error("Refresh token already used or invalid");
  }
  // exp is date string
  const now = Date.now();

  if (new Date(payload.exp).getTime() <= now) {
    throw new Error("Refresh token expired");
  }

  return payload;
};

// refresh-store.ts
const refreshStore = new Map<string, string>();
// jti -> expiry timestamp (ms)

export function storeRefreshJti(jti: string, exp: string) {
  refreshStore.set(jti, exp);
}

export function consumeRefreshJti(jti: string): boolean {
  if (!refreshStore.has(jti)) return false;
  refreshStore.delete(jti);
  return true;
}

export function cleanupExpiredRefreshTokens() {
  const now = Date.now();
  for (const [jti, exp] of refreshStore) {
    if (new Date(exp).getTime() <= now) refreshStore.delete(jti);
  }
}
/**
 * Validates Docker container name and ensures it is URL-safe (DNS-safe)
 * Docker rules: lowercase letters, digits, hyphens, underscores, max 63 chars, must start with letter or digit
 */
function isValidContainerName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name.length === 0 || name.length > 63) return false;

  // Must start with lowercase letter or digit
  if (!/^[a-z0-9]/.test(name)) return false;

  // Only allow lowercase letters, digits, hyphen and underscore
  if (!/^[a-z0-9-_]+$/.test(name)) return false;

  // Cannot end with hyphen or underscore
  if (/[-_]$/.test(name)) return false;

  return true;
}

function generateShortSuffix(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}

export function mustBeTrue(
  condition: unknown,
  message: string
): asserts condition {
  if (condition) {
    return;
  }

  throw new BadRequest(message);
}

export const getArtifactStorageLocation = (
  type: "STATIC" | "DYNAMIC",
  artifact_id: string
) => {
  let artifactRoot: string, artifactTemp: string;
  if (type === "STATIC") {
    artifactRoot = STATIC_ARTIFACT_ROOT;
    artifactTemp = STATIC_TEMP_DIR;
  } else if (type === "DYNAMIC") {
    artifactRoot = DYNAMIC_ARTIFACT_ROOT;
    artifactTemp = DYNAMIC_TEMP_DIR;
  } else {
    throw new Error("Invalid artifact type");
  }
  const artifactPath = path.join(artifactRoot, artifact_id);
  return artifactPath;
};

export const addAllTokensToCookie = async (
  c: Context,
  userId: string,
  reset: boolean = false
) => {
  const logger = getLogger();

  const scheme = c.get("scheme");
  const secure = scheme !== "http";

  // 🔑 single source of truth for cookie configs
  const cookieConfigs = {
    access_token: {
      httpOnly: true,
      sameSite: "Lax" as const,
      path: "/",
    },
    refresh_token: {
      httpOnly: true,
      path: "/api/admin/refresh",
    },
    csrf_token: {
      httpOnly: false,
      sameSite: "strict" as const,
      path: "/",
    },
  };

  // 🔁 helper to set OR clear
  const applyCookie = (
    name: keyof typeof cookieConfigs,
    value: string
  ) => {
    const config = cookieConfigs[name];

    setCookie(c, name, value, {
      secure,
      ...config,
      ...(reset && {
        maxAge: 0,
        expires: new Date(0),
      }),
    });
  };

  // 🔴 Clear cookies
  if (reset) {
    logger.info("Clearing cookies");

    (Object.keys(cookieConfigs) as (keyof typeof cookieConfigs)[]).forEach(
      (key) => applyCookie(key, "")
    );

    return;
  }

  // 🟢 Generate tokens
  const [access_token, refresh_token, csrf_token] = await Promise.all([
    generateAccessToken(userId),
    generateRefreshToken(userId),
    generateCSRFToken(userId),
  ]);

  logger.info("Setting cookies");

  applyCookie("access_token", access_token);
  applyCookie("refresh_token", refresh_token.token);
  applyCookie("csrf_token", csrf_token);
};

// export async function buildWireguardConfig() {
//   const peers = await db.select().from(wireguardPeersTable);

//   const server = peers.find((p) => p.type === WireguardPeerType.SERVER);

//   if (!server) {
//     throw new Error("WireGuard server not found");
//   }

//   let config = `[Interface]
// PrivateKey = ${server.private_key}
// Address = 10.13.13.1/24
// ListenPort = 51820

// PostUp = iptables -A FORWARD -i %i -j ACCEPT; \
//          iptables -A FORWARD -o %i -j ACCEPT; \
//          iptables -t nat -A POSTROUTING -o eth+ -j MASQUERADE; \
//          iptables -t nat -A POSTROUTING -o br+ -j MASQUERADE

// PostDown = iptables -D FORWARD -i %i -j ACCEPT; \
//            iptables -D FORWARD -o %i -j ACCEPT; \
//            iptables -t nat -D POSTROUTING -o eth+ -j MASQUERADE; \
//            iptables -t nat -D POSTROUTING -o br+ -j MASQUERADE
// `;

//   for (const peer of peers) {
//     if (
//       peer.type === WireguardPeerType.CLIENT &&
//       peer.public_key &&
//       peer.ip_index
//     ) {
//       const ip = `10.0.0.${peer.ip_index}`;

//       config += `[Peer]
// PublicKey = ${peer.public_key}
// AllowedIPs = ${ip}/32

// `;
//     }
//   }

//   return config;
// }

export const getServerAddress = async () => {
  const domainSetting = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "domain"))
    .get();

  // get public ip
  const serverAddress = domainSetting?.value || (await publicIpv4());
  return serverAddress;
};

export async function ensureServerWireguardPeer() {
  let serverPeer: {
    id: string;
    type: WireguardPeerType.SERVER;
    ip_index: number;
    public_key?: string;
    private_key?: string;
  } = await db
    .select()
    .from(wireguardPeersTable)
    .where(eq(wireguardPeersTable.type, WireguardPeerType.SERVER))
    .get();

  const now = new Date().toISOString();

  // 1️⃣ Create server peer if it does not exist
  if (!serverPeer) {
    const id = generateId();

    await db.insert(wireguardPeersTable).values({
      id,
      name: "server",
      type: WireguardPeerType.SERVER,
      status: WireguardPeerStatus.IN_PROGRESS,
      ip_index: 1,
      created_at: now,
      updated_at: now
    });

    serverPeer = {
      id,
      type: WireguardPeerType.SERVER,
      ip_index: 1
    };
  }

  // 2️⃣ Generate keys if missing
  if (!serverPeer.public_key || !serverPeer.private_key) {
    emitEvent("create_wireguard_peer", {
      id: serverPeer.id,
      type: WireguardPeerType.SERVER,
      ip_index: serverPeer.ip_index
    });
  }

  return serverPeer;
}

export async function initiateRouteReload() {
  const logger = getLogger();
  logger.info("initiating route reload");
  await fetch(`${reverseProxyURL}/__proxy__/reload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
}
export const asyncLocalStorage = new AsyncLocalStorage<ContextType>();
