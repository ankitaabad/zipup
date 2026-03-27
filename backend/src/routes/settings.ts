import { withErrorHandler } from "./../utils/middlewares";
import { Hono } from "hono";
import { db } from "@backend/db/dbClient";
import { settingsTable } from "../db/schema";
import { errorHandler } from "../utils/errorHandler";
import { DomainNameSchema } from "@common/index";
import { initiateRouteReload } from "@backend/utils/helper";

// change global secret key

export const settingsRouter = new Hono();

// set debug logs
settingsRouter.put("/debug-logs", async (c) => {
  try {
    const { enabled } = await c.req.json();
    // upsert into global_config table
    await db
      .insert(settingsTable)
      .values({
        key: "debug_logs",
        value: enabled ? "1" : "0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .onConflictDoUpdate({
        target: [settingsTable.key],
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

settingsRouter.put(
  "/cert-email",
  withErrorHandler(async (c) => {
    const { email } = await c.req.json();
    // upsert
    const now = new Date().toISOString();
    await db
      .insert(settingsTable)
      .values({
        key: "cert_email",
        value: email,
        created_at: now,
        updated_at: now
      })
      .onConflictDoUpdate({
        target: [settingsTable.key],
        set: { value: email, updated_at: now }
      });
    return c.json({
      message: "Global cert email setting updated successfully",
      data: { email }
    });
  })
);

settingsRouter.put(
  "/domain",
  withErrorHandler(async (c) => {
    const { domain } = DomainNameSchema.parse(await c.req.json());
    console.log({ domain });
    const now = new Date().toISOString();
    await db
      .insert(settingsTable)
      .values({
        key: "domain",
        value: domain,
        created_at: now,
        updated_at: now
      })
      .onConflictDoUpdate({
        target: [settingsTable.key],
        set: { value: domain, updated_at: now }
      });
    await initiateRouteReload();
    return c.json({
      message: "Admin console domain updated successfully",
      data: { domain }
    });
  })
);

settingsRouter.get(
  "/",
  withErrorHandler(async (c) => {
    const settings = await db.select().from(settingsTable);
    //todo: only required settings
    return c.json({ data: settings });
  })
);
