import { sqliteTable as table, integer } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-arktype";
export const global_config = table("global_config", {
  key: t.text().primaryKey(),
  value: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const apps = table("apps", {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
  api_key: t.text().notNull(),
  type: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const deployments = table("deployments", {
  id: t.text().primaryKey(),
  app_id: t.text().notNull(),
  version: t.integer().notNull(),
  status: t.text().notNull(),
  created_at: t.text().notNull(),
  updated_at: t.text().notNull()
});

export const appSchema = createSelectSchema(apps);

// apps
// deployment
// env
// global config
// user
// caddy config
//
