import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite", // 'mysql' | 'sqlite' | 'turso'
  schema: "./src/db/schema.ts",
  dbCredentials: { url: "./src/db/my_database.db" },
  out: "./drizzle/migrations"
});
