import { defineConfig } from "drizzle-kit";
const dbPath = process.env.isLocal ? "./src/db/zipup.db" : "";
export default defineConfig({
  dialect: "sqlite", // 'mysql' | 'sqlite' | 'turso'
  schema: "./src/db/schema.ts",
  dbCredentials: { url: "./src/db/zipup.db" },
  out: "./drizzle/migrations"
});
