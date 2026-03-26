import { randomBytes } from "node:crypto";
import crypto from "node:crypto";
import fs from "fs";
import { V4 } from "paseto";
import path from "path";
import { generateId } from "./helper";
import { appLogger } from "./logger";
type PasetoKeys = {
  publicKey: string;
  secretKey: string;
  createdAt: string;
  version: string;
};
const pasetoKeysFilePath = path.join("/", "secrets", "tokens.json");
const encryptionKeyFilePath = path.join("/", "secrets", "encryptionKey.json");
const getNewPasetoKey = async () => {
  const version = generateId();
  const keys = await V4.generateKey("public", { format: "paserk" });
  return {
    version,
    keys,
    createdAt: new Date().toISOString()
  };
};
let encryptionKey: string | undefined;

export function getEncryptionKey(): Buffer {
  if (encryptionKey) {
    return Buffer.from(encryptionKey, "base64");
  }

  if (!fs.existsSync(encryptionKeyFilePath)) {
    const key = crypto.randomBytes(32).toString("base64");

    fs.writeFileSync(
      encryptionKeyFilePath,
      JSON.stringify({ encryptionKey: key }),
      { flag: "wx" } // avoid overwrite in race condition
    );

    encryptionKey = key;
    return Buffer.from(key, "base64");
  }

  const data = fs.readFileSync(encryptionKeyFilePath, "utf8");

  if (!data || data.trim().length === 0) {
    throw new Error("Encryption key file is empty");
  }

  let parsed;
  try {
    parsed = JSON.parse(data);
  } catch {
    throw new Error("Encryption key file is corrupted");
  }

  if (!parsed.encryptionKey) {
    throw new Error("Invalid key structure");
  }

  encryptionKey = parsed.encryptionKey;

  const keyBuffer = Buffer.from(encryptionKey, "base64");

  if (keyBuffer.length !== 32) {
    throw new Error("Invalid key length (must be 32 bytes)");
  }

  return keyBuffer;
}
export async function ensureTokenKeysExists() {
  const logger = appLogger.child();

  if (!fs.existsSync(pasetoKeysFilePath)) {
    logger.debug("token file does not exist");
    const { version, keys, createdAt } = await getNewPasetoKey();
    fs.writeFileSync(
      pasetoKeysFilePath,
      JSON.stringify({ [version]: { ...keys, createdAt, version } })
    );
    logger.debug("token file created successfully");
  } else {
    // read file
    logger.debug("token file exists");
    const data = fs.readFileSync(pasetoKeysFilePath);
    if (!data) {
      logger.debug("token file is empty");
      const { version, keys, createdAt } = await getNewPasetoKey();
      fs.writeFileSync(
        pasetoKeysFilePath,
        JSON.stringify({ [version]: { ...keys, createdAt, version } })
      );
      logger.debug("token added to file successfully");
    }
  }
}
export async function rotatePasetoKeys() {
  // read from file
  const logger = appLogger.child();
  logger.debug("rotating paseto keys");
  if (!fs.existsSync(pasetoKeysFilePath)) {
    logger.debug("token file does not exist");
    await ensureTokenKeysExists();
    return;
  }
  const data = fs.readFileSync(pasetoKeysFilePath);
  if (!data) {
    logger.debug("token file is empty");
    await ensureTokenKeysExists();
    return;
  } else {
    const { version, keys, createdAt } = await getNewPasetoKey();
    const tokens = JSON.parse(data.toString());
    tokens[version] = { ...keys, createdAt, version };
    fs.writeFileSync(pasetoKeysFilePath, JSON.stringify(tokens));
    logger.debug("token rotated successfully successfully");
    //todo:  add job to delete old token
  }
}

export async function removeOldPasetoKeys() {
  const logger = appLogger.child();
  logger.debug("removing old paseto keys");
  const data = fs.readFileSync(pasetoKeysFilePath);
  if (!data) {
    logger.debug("token file is empty");
    return;
  } else {
    const tokens = JSON.parse(data.toString());
    if (!tokens) {
      logger.debug("token file is empty");
      return;
    }
    if (Object.keys(tokens).length <= 1) {
      logger.debug("only one token found");
      return;
    }
    const latestKey = await findLatestPasetoKeys(tokens);
    await fs.writeFileSync(
      pasetoKeysFilePath,
      JSON.stringify({
        [latestKey.version]: latestKey
      })
    );
  }
}
let pasetoKeys: PasetoKeys | undefined;
export async function getPasetoKeys() {
  if (pasetoKeys) {
    return pasetoKeys;
  }
  pasetoKeys = await getLatestPasetoKeys();
  return pasetoKeys!;
}
export async function getLatestPasetoKeys() {
  const logger = appLogger.child();
  logger.debug("getting paseto keys");
  if (pasetoKeys) {
    return pasetoKeys;
  }
  if (!fs.existsSync(pasetoKeysFilePath)) {
    await ensureTokenKeysExists();
  }
  // get latest token
  const data = fs.readFileSync(pasetoKeysFilePath);
  if (!data) {
    logger.debug("token file is empty");
    return;
  } else {
    const pasetoKeys = JSON.parse(data.toString());
    // get latest
    return findLatestPasetoKeys(pasetoKeys);
  }
}
async function findLatestPasetoKeys(pasetoKeys: Record<string, PasetoKeys>) {
  const keys = Object.keys(pasetoKeys);

  let lateseVersion = keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (pasetoKeys[keys[i]].createdAt > pasetoKeys[lateseVersion].createdAt) {
      lateseVersion = keys[i];
    }
  }
  return pasetoKeys[lateseVersion];
}
