import crypto from "node:crypto";

// 32 bytes = 256 bits (AES-256)
const key = crypto.randomBytes(32);

const encKey =
  "1d3352caef90975cef0bcb77f35f8c7bc9e8c8e45e44cf44cc76fe4dfd188285";
export function createSecretKey() {
  return crypto.randomBytes(32).toString("hex");
}
export function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(12); // 96-bit nonce (recommended for GCM)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Return iv + tag + encrypted ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertextBase64, key) {
  const data = Buffer.from(ciphertextBase64, "base64");

  const iv = data.slice(0, 12); // first 12 bytes
  const tag = data.slice(12, 28); // next 16 bytes (GCM tag)
  const encrypted = data.slice(28); // remaining bytes

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}


export function sha256(data: string | Buffer) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function signPayload(
  method: string,
  path: string,
  timestamp: string,
  bodyHash: string,
  secretKey: string
) {
  const canonical = [
    method.toUpperCase(),
    path,
    timestamp,
    bodyHash
  ].join("\n");

  return crypto
    .createHmac("sha256", Buffer.from(secretKey, "hex"))
    .update(canonical)
    .digest("hex");
}

