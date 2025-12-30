import { appSchema, appsTable, portSchema } from "./../src/db/schema";
import { portsTable, usersTable } from "../src/db/schema";
import { generateId, hashPassword } from "../src/utils/helper";
import { db } from "../utils";

async function initDB() {
  // Initialize the database
  const password = "Passup@123";
  const password_hash = await hashPassword(password);
  const user = {
    id: generateId(),
    username: "passup",
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: true
  };
  const ports: (typeof portSchema.infer)[] = [];
  for (let port = 7000; port <= 8000; port++) {
    ports.push({
      port: port,
      status: "AVAILABLE",
      app_id: null,
      deployment_id: null,
      allocated_at: null
    });
  }
  const app: typeof appSchema.infer = {
    id: generateId(),
    name: "passup",
    type: "DYNAMIC",
    start_command: "node server.js",
    domain: "localhost", //todo: get the ip address of the machine
    app_key: generateId(),
    internal_port: 3000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_enabled: true,
    redis_prefix: "passup",
    redis_username: null,
    redis_password: null,
    path_prefix: "/"
  };
  await db.transaction(async (tx) => {
    await Promise.all([
      tx.insert(usersTable).values(user),
      tx.insert(portsTable).values(ports),
      tx.insert(appsTable).values(app)
    ]);
  });
}

initDB();
