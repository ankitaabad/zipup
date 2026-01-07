import { appSchema, appsTable } from "./../src/db/schema";
import {  platformAdminsTable } from "../src/db/schema";
import { generateId, hashPassword } from "../src/utils/helper";
import { db } from "../utils";

async function initDB() {
  // Initialize the database
  const password = "Paasup@123";
  const password_hash = await hashPassword(password);
  const user = {
    id: generateId(),
    username: "paasup",
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: true
  };

  const app: typeof appSchema.infer = {
    id: generateId(),
    name: "paasup",
    type: "DYNAMIC",
    start_command: "node server.js",
    domain: "localhost", //todo: get the ip address of the machine
    app_key: generateId(),
    private: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_enabled: true,
    redis_prefix: "paasup",
    redis_username: null,
    redis_password: null,
    path_prefix: "/"
  };
  await db.transaction(async (tx) => {
    await Promise.all([
      tx.insert(platformAdminsTable).values(user),
      tx.insert(appsTable).values(app)
    ]);
  });
}

initDB();
