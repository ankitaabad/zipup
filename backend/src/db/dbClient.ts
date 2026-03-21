import { drizzle } from "drizzle-orm/libsql";

const dbPath = process.env.DB_PATH || "./src/db";

export const db = drizzle({
  connection: {
    url: `file:${dbPath}/zipup.db`
  }
});
