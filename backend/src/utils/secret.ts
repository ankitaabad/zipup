import crypto from "node:crypto";

export function createSecretKey() {
  return `zipup_sk_${crypto.randomBytes(32).toString("hex")}`;
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

export function generateApiKey() {
  const bytes = crypto.randomBytes(32);
  const base = bytes.toString("base64url");
  return `zipup_ak_${base}`;
}
