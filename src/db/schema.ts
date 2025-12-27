import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-arktype";
export const global_config = table("global_config", {
  key: t.text().primaryKey(),
  value: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const appsTable = table("apps", {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  app_key: t.text().notNull(),
  type: t.text().notNull(),
  domain: t.text(),
  path_prefix: t.text(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull(),
  enabled: t.integer().notNull(), // 0 or 1
  latest_version: t.text()
});

export const usersTable = table("users", {
  id: t.text().primaryKey(),
  username: t.text().notNull().unique(),
  password_hash: t.text().notNull(),
  is_admin: t.integer().notNull(), // 0 or 1
  authenticator_secret: t.text(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});
export const artifactsTable = table("artifacts", {
  id: t.text().primaryKey(),
  app_id: t.text().notNull(),
  version: t.integer().notNull(),
  status: t.text().notNull(), // created | uploading | ready | failed
  path: t.text(),
  size: t.integer(),
  checksum: t.text(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const deploymentsTable = table("deployments", {
  id: t.text().primaryKey(),

  app_id: t.text().notNull(),

  artifact_id: t.text().notNull(), // 🔑 reference artifact

  status: t.text().notNull(), // pending | deploying | active | failed | rolled_back

  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});


export const secretsTable = table("secrets", {
  id: t.text().primaryKey(),
  app_id: t.text().notNull(),
  key: t.text().notNull(),
  value: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});
export const appSchema = createSelectSchema(appsTable);
export const userSchema = createSelectSchema(usersTable);
export const deploymentSchema = createSelectSchema(deploymentsTable);
export const globalConfigSchema = createSelectSchema(global_config);
export const secretSchema = createSelectSchema(secretsTable);
// apps
// deployment
// env
// global config
// user
// caddy config
//
