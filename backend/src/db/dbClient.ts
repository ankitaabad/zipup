import { drizzle } from "drizzle-orm/libsql";

export const db = drizzle({
  connection: {
    url: "file:./src/db/my_database.db"
  }
});