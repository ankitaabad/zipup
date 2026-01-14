import { db } from "@backend/db/dbClient";
import { appSchema, appsTable } from "@backend/db/schema";
import { platformAdminsTable } from "@backend/db/schema";
import { generateId, hashPassword } from "@backend/utils/helper";

async function initDB() {
  // Initialize the database
  console.log("Initializing database...");
  const password = "zipup@123";
  const password_hash = await hashPassword(password);
  const user = {
    id: generateId(),
    username: "zipup",
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: true
  };

  // const app: typeof appSchema.infer = {
  //   id: generateId(),
  //   name: "zipup",
  //   type: "DYNAMIC",
  //   start_command: "node server.js",
  //   domain: "localhost", //todo: get the ip address of the machine
  //   app_key: generateId(),
  //   secret_key: createSecretKey(),
  //   private: false,
  //   created_at: new Date().toISOString(),
  //   updated_at: new Date().toISOString(),
  //   is_enabled: true,
  //   redis_prefix: "zipup",
  //   redis_username: null,
  //   redis_password: null,
  //   path_prefix: "/"
  // };
  await db.transaction(async (tx) => {
    await Promise.all([
      tx.insert(platformAdminsTable).values(user)
      // tx.insert(appsTable).values(app)
    ]);
  });
  console.log("Database initialized");
}

initDB();
