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
  ISSUER,
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
  WireguardPeerType
} from "@backend/db/schema";
import { db } from "@backend/db/dbClient";
import { eq } from "drizzle-orm";
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

//todo: move to env variables
export const paseto_public =
  "k4.public.A6MGiHZr7HSerutizAV1OrD_Yetd7RxL3M7dBz2_tts";
export const paseto_secret =
  "k4.secret.6kiOV7jlw_rThVXqqUC-AtxznaZPwodA6geN1EogdnoDowaIdmvsdJ6u62LMBXU6sP9h613tHEvczt0HPb-22w";

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

  return await V4.sign(payload, paseto_secret as string);
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
  return {
    jti,
    token: await V4.sign(payload, paseto_secret as string)
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
  return await V4.sign(payload, paseto_secret as string);
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
  const payload = (await V4.verify(token, paseto_public as string, {
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
  const payload = (await V4.verify(
    token,
    paseto_public as string
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

export const addAllTokensToCookie = async (c: Context, userId: string) => {
  const [access_token, refresh_token, csrf_token] = await Promise.all([
    generateAccessToken(userId),
    generateRefreshToken(userId),
    generateCSRFToken(userId)
  ]);
  setCookie(c, "access_token", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax"
  });
  setCookie(c, "refresh_token", refresh_token.token, {
    httpOnly: true,
    secure: true,
    path: "/api/admin/refresh"
  });
  setCookie(c, "csrf_token", csrf_token, {
    httpOnly: false,
    secure: true,
    sameSite: "strict"
  });
};

export async function buildWireguardConfig() {
  const peers = await db.select().from(wireguardPeersTable);

  const server = peers.find((p) => p.type === WireguardPeerType.SERVER);

  if (!server) {
    throw new Error("WireGuard server not found");
  }

  let config = `[Interface]
PrivateKey = ${server.private_key}
Address = 10.0.0.1/24
ListenPort = 51820

`;

  for (const peer of peers) {
    if (
      peer.type === WireguardPeerType.CLIENT &&
      peer.public_key &&
      peer.ip_index
    ) {
      const ip = `10.0.0.${peer.ip_index}`;

      config += `[Peer]
PublicKey = ${peer.public_key}
AllowedIPs = ${ip}/32

`;
    }
  }

  return config;
}

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
