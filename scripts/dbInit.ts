import { usersTable } from "../src/db/schema";
import { generateId, hashPassword } from "../src/utils/helper";
import { db } from "../utils";

async function initDB() {
  // Initialize the database
  const password = "Pass@123";
  const password_hash = await hashPassword(password);
  const user = {
    id: generateId(),
    username: "passup",
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: 1
  };
  await db.insert(usersTable).values(user);
}
initDB();
