import KSUID from "ksuid";

import { hash, verify } from "@node-rs/argon2";
import { sha1 } from "@oslojs/crypto/sha1";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { V4 } from "paseto";
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
const paseto_public = "k4.public.A6MGiHZr7HSerutizAV1OrD_Yetd7RxL3M7dBz2_tts";
const paseto_secret =
  "k4.secret.6kiOV7jlw_rThVXqqUC-AtxznaZPwodA6geN1EogdnoDowaIdmvsdJ6u62LMBXU6sP9h613tHEvczt0HPb-22w";

const ACCESS_TTL = 20 * 60; // seconds
const REFRESH_TTL = 24 * 60 * 60;

export const ISSUER = "passup_server";
export const ACCESS_AUD = "passup_api";
export const APP_AUD = "app_access";
export const REFRESH_AUD = "token_refresh";

export const generateAccessToken = async (user_id: string, aud: string) => {
  const iat = new Date().toISOString();
  const exp = new Date(Date.now() + ACCESS_TTL).toISOString();
  const payload = {
    sub: user_id,
    aud,
    iss: ISSUER,
    purpose: "access",
    iat,
    exp
  };

  return V4.sign(payload, paseto_secret as string);
};
//todo: check for rigth value of aud and purpose
export const generateRefreshToken = async (user_id: string) => {
  const iat = new Date().toISOString();
  const exp = new Date(Date.now() + REFRESH_TTL).toISOString();
  const jti = generateId();
  const payload = {
    sub: user_id,
    aud: REFRESH_AUD,
    iss: ISSUER,
    purpose: "refresh",
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
    issuer: ISSUER,
    audience: ACCESS_AUD
  })) as AccessTokenPayload;

  // Ensure token purpose
  if (payload.purpose !== "access") {
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
  aud: typeof REFRESH_AUD;
  iss: string;
  purpose: "refresh";
  jti: string;
  iat: number;
  exp: number;
};

export const verifyRefreshToken = async (
  token: string
): Promise<RefreshTokenPayload> => {
  const payload = (await V4.verify(token, paseto_public as string, {
    issuer: ISSUER,
    audience: REFRESH_AUD
  })) as RefreshTokenPayload;
  if (!payload.jti) {
    throw new Error("Missing jti");
  }
  const consumed = consumeRefreshJti(payload.jti);
  if (!consumed) {
    throw new Error("Refresh token already used or invalid");
  }
  // exp is date string
  const now = Date.now();

  if (payload.purpose !== "refresh") {
    throw new Error("Invalid token purpose");
  }

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
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}