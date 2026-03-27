import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import { index } from "drizzle-orm/sqlite-core";
import { unique } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";
import { primaryKey } from "drizzle-orm/sqlite-core";
import { DEPLOYMENT_STATUS } from "@zipup/common";
export const settingsTable = table("settings", {
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
    secret_key: t.text().notNull(),
    type: t.text().$type<APP_TYPE>().notNull(),
    start_command: t.text(),
    domain: t.text(),
    //todo: do we need a status here or do we infer from deployment and container status.
    // path_prefix: t.text(),
    // internal_port: t.integer(),
    redis_prefix: t.text(),
    redis_username: t.text(),
    redis_password: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull(),
    private: t.integer({ mode: "boolean" }),
    is_enabled: t.integer({ mode: "boolean" }).notNull() // 0 or 1
    // latest_version: t.text()
  },
  (table) => [
    unique("apps_app_key_idx").on(table.app_key),
    unique("apps_name_idx").on(table.name),
    unique("apps_secret_key_idx").on(table.secret_key),
    unique("apps_redis_prefix_idx").on(table.redis_prefix)
    //todo: an index on domain + path prefix
  ]
);

export const platformAdminsTable = table(
  "platform_admins",
  {
    id: t.text().primaryKey(),
    username: t.text().notNull().unique(),
    password_hash: t.text().notNull(),
    is_2fa_enabled: t.integer({ mode: "boolean" }).notNull().default(false),
    authenticator_secret: t.text(), // encrypted TOTP secret
    status: t.text().notNull().default("active"), // active, disabled
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [unique("platform_admins_username_idx").on(table.username)]
);
export const platformAdminSchema = createSelectSchema(platformAdminsTable);

export const usersTable = table(
  "users",
  {
    id: t.text().primaryKey(),
    username: t.text().notNull().unique(),
    password_hash: t.text().notNull(),
    status: t.text().notNull().default("active"), // active, suspended
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [unique("users_username_idx").on(table.username)]
);

export const groupsTable = table(
  "groups",
  {
    id: t.text().primaryKey(),
    name: t.text().notNull(),
    description: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [unique("groups_name_idx").on(table.name)]
);

export const userGroupsTable = table(
  "user_groups",
  {
    user_id: t
      .text()
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    group_id: t
      .text()
      .notNull()
      .references(() => groupsTable.id),
    created_at: t.text().notNull()
  },
  (table) => [primaryKey({ columns: [table.user_id, table.group_id] })]
);

export const groupAppsTable = table(
  "group_apps",
  {
    group_id: t
      .text()
      .notNull()
      .references(() => groupsTable.id, { onDelete: "cascade" }),
    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    created_at: t.text().notNull()
  },
  (table) => [primaryKey({ columns: [table.group_id, table.app_id] })]
);

type ARTIFACT_STATUS = "UPLOADING" | "SUCCESS" | "FAILED";
export const artifactsTable = table(
  "artifacts",
  {
    id: t.text().primaryKey(),
    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    version: t.integer().notNull(),
    status: t.text().$type<ARTIFACT_STATUS>().notNull(),
    path: t.text(),
    size: t.integer(),
    checksum: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("artifacts_app_idx").on(table.app_id)]
);
export const deploymentsTable = table(
  "deployments",
  {
    id: t.text().primaryKey(),

    app_id: t
      .text()
      .notNull()
      .references(() => appsTable.id, { onDelete: "cascade" }),
    version: t.text(),
    artifact_id: t
      .text()
      .notNull()
      .references(() => artifactsTable.id, { onDelete: "cascade" }),
    container_name: t.text(),
    // host_port: t.integer(),
    status: t.text().$type<DEPLOYMENT_STATUS>().notNull(),
    failureLogs: t.text(),
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
      .references(() => appsTable.id, { onDelete: "cascade" }),
    key: t.text().notNull(),
    value: t.text().notNull(),
    description: t.text(),
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
      .references(() => appsTable.id, { onDelete: "cascade" }),
    key: t.text().notNull(),
    value: t.text().notNull(),
    description: t.text(),
    created_at: t.text().notNull(),
    updated_at: t.text().notNull()
  },
  (table) => [index("env_vars_app_idx").on(table.app_id)]
);

export const enum WireguardPeerStatus {
  IN_PROGRESS = "IN_PROGRESS",
  ACTIVE = "ACTIVE"
}
export const enum WireguardPeerType {
  CLIENT = "CLIENT",
  SERVER = "SERVER"
}
// wireguard peer table
export const wireguardPeersTable = table("wireguard_peers", {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  description: t.text(),
  type: t.text().$type<WireguardPeerType>().notNull(),
  public_key: t.text(),
  private_key: t.text(),
  preshared_key: t.text(),
  status: t.text().$type<WireguardPeerStatus>().notNull(),
  ip_index: t.integer(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const appSchema = createSelectSchema(appsTable);
export const userSchema = createSelectSchema(platformAdminsTable);
export const deploymentSchema = createSelectSchema(deploymentsTable);
export const globalConfigSchema = createSelectSchema(settingsTable);
export const secretSchema = createSelectSchema(secretsTable);
export const envVarSchema = createSelectSchema(envVarsTable);
export const artifactSchema = createSelectSchema(artifactsTable);
