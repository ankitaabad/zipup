import crypto from "node:crypto";
import { drizzle } from "drizzle-orm/libsql";

export function generateSigningSecret() {
  return "passup_ak" + crypto.randomBytes(64).toString("base64url");
}

export function generateApiKey() {
  const bytes = crypto.randomBytes(32);
  const base = bytes.toString("base64url");
  return `passup_sk_${base}`;
}

export const db = drizzle({
  connection: {
    url: "file:./my_database.db"
  }
});
