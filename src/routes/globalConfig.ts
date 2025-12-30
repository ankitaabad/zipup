import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema, globalConfigTable } from "../db/schema";
import { generateId } from "../utils/helper";

// change global secret key

export const globalConfigRouter = new Hono();
globalConfigRouter.put("/deployment_secret_key", async (c) => {
  const secret_key = generateId();
  // upsert into global_config table
  await db
    .insert(globalConfigTable)
    .values({
      key: "deployment_secret_key",
      value: secret_key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .onConflictDoUpdate({
      target: [globalConfigTable.key],
      set: { value: secret_key }
    });
  return c.json({
    message: "Global deployment secret key updated successfully",
    data: { secret_key }
  });
});

// set debug logs
globalConfigRouter.put("/debug_logs", async (c) => {
  const { enabled } = await c.req.json();
  // upsert into global_config table
  await db
    .insert(globalConfigTable)
    .values({
      key: "debug_logs",
      value: enabled ? "1" : "0",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .onConflictDoUpdate({
      target: [globalConfigTable.key],
      set: { value: enabled ? "1" : "0" }
    });
  return c.json({
    message: "Global debug logs setting updated successfully",
    data: { enabled }
  });
});

