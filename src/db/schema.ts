import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-arktype";
import { index } from "drizzle-orm/sqlite-core";
import { unique } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";
export const globalConfigTable = table("global_config", {
  key: t.text().primaryKey(),
  value: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});
export type APP_TYPE = "STATIC" | "DYNAMIC";
export const appsTable = table(
  "apps",
  {
    id: t.text().primaryKey(),
    name: t.text().notNull(),
    app_key: t.text().notNull(),
    type: t.text().$type<APP_TYPE>().notNull(),
    start_command: t.text().notNull(),
    domain: t.text(),
    path_prefix: t.text(),
    // internal_port: t.integer(),
    redis_prefix: t.text(),
    redis_username: t.text(),
    redis_password: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull(),
    private : t.integer({mode:"boolean"}),
    is_enabled: t.integer({ mode: "boolean" }).notNull() // 0 or 1
    // latest_version: t.text()
  },
  (table) => [
    unique("apps_app_key_idx").on(table.app_key),
    unique("apps_redis_prefix_idx").on(table.redis_prefix)
    //todo: an index on domain + path prefix
  ]
);

export const usersTable = table(
  "users",
  {
    id: t.text().primaryKey(),
    username: t.text().notNull().unique(),
    password_hash: t.text().notNull(),
    is_admin: t.integer({ mode: "boolean" }).notNull(), // 0 or 1
    authenticator_secret: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [unique("users_username_idx").on(table.username)]
);
type ARTIFACT_STATUS = "UPLOADING" | "SUCCESS" | "FAILED";
export const artifactsTable = table(
  "artifacts",
  {
    id: t.text().primaryKey(),
    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id),
    version: t.text().notNull(),
    status: t.text().$type<ARTIFACT_STATUS>().notNull(),
    path: t.text(),
    size: t.integer(),
    checksum: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("artifacts_app_idx").on(table.app_id)]
);
export type DEPLOYMENT_STATUS = "IN_PROGRESS" | "SUCCESS" | "FAILED";
export const deploymentsTable = table(
  "deployments",
  {
    id: t.text().primaryKey(),

    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id),
    version: t.text(),
    artifact_id: t
      .text()
      .notNull()
      .references(() => artifactsTable.id),
    container_name: t.text(),
    // host_port: t.integer(),
    status: t.text().$type<DEPLOYMENT_STATUS>().notNull(),

    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("deployments_app_idx").on(table.app_id)]
);

export const secretsTable = table(
  "secrets",
  {
    id: t.text().primaryKey(),
    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id),
    key: t.text().notNull(),
    value: t.text().notNull(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("secrets_app_idx").on(table.app_id)]
);
export const envVarsTable = table(
  "env_vars",
  {
    id: t.text().primaryKey(),
    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id),
    key: t.text().notNull(),
    value: t.text().notNull(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("env_vars_app_idx").on(table.app_id)]
);


export const appSchema = createSelectSchema(appsTable);
export const userSchema = createSelectSchema(usersTable);
export const deploymentSchema = createSelectSchema(deploymentsTable);
export const globalConfigSchema = createSelectSchema(globalConfigTable);
export const secretSchema = createSelectSchema(secretsTable);
export const envVarSchema = createSelectSchema(envVarsTable);
export const artifactSchema = createSelectSchema(artifactsTable);
