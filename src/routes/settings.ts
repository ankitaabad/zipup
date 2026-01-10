import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema, settings } from "../db/schema";
import { generateId } from "../utils/helper";
import { errorHandler } from "../utils/errorHandler";

// change global secret key

export const settingsRouter = new Hono();
// settingsRouter.put("/deployment_secret_key", async (c) => {
//   const secret_key = generateId();
//   // upsert into global_config table
//   await db
//     .insert(settings)
//     .values({
//       key: "deployment_secret_key",
//       value: secret_key,
//       created_at: new Date().toISOString(),
//       updated_at: new Date().toISOString()
//     })
//     .onConflictDoUpdate({
//       target: [settings.key],
//       set: { value: secret_key }
//     });
//   return c.json({
//     message: "Global deployment secret key updated successfully",
//     data: { secret_key }
//   });
// });

// set debug logs
settingsRouter.put("/debug-logs", async (c) => {
  try {
    const { enabled } = await c.req.json();
    // upsert into global_config table
    await db
      .insert(settings)
      .values({
        key: "debug_logs",
        value: enabled ? "1" : "0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflictDoUpdate({
        target: [settings.key],
        set: { value: enabled ? "1" : "0" }
      });
    return c.json({
      message: "Global debug logs setting updated successfully",
      data: { enabled }
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});

settingsRouter.put("/cert-email", async (c) => {
  try {
    const { email } = await c.req.json();
    // upsert
    await db
      .insert(settings)
      .values({
        key: "cert_email",
        value: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflictDoUpdate({
        target: [settings.key],
        set: { value: email }
      });
    return c.json({
      message: "Global cert email setting updated successfully",
      data: { email }
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});
