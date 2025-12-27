import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema } from "../db/schema";
import { generateId } from "../utils/helper";
import { eq } from "drizzle-orm";
import { getLogger } from "../utils/logger";

export const appsRouter = new Hono();
const createAppSchema = type({
  name: type.string,
  type: type.enumerated("static", "dynamic")
});

appsRouter.post("/", async (c) => {
  //todo: wrap inside an error handler middleware
  const logger = getLogger();
  const { name, type } = createAppSchema.assert(await c.req.json());
  const app: typeof appSchema.infer = {
    id: generateId(),
    name,
    app_key: generateApiKey(),
    type,
    enabled: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // latest_version: null,
    domain: null,
    path_prefix: null
  };
  const result = await db.insert(appsTable).values(app);
  logger.debug(JSON.stringify(result));
  return c.json({
    message: "App created successfully",
    data: app
  });
});

// get all apps
appsRouter.get("/", async (c) => {
  const apps = await db.select().from(appsTable);
  return c.json({
    data: apps.map((app) => omit(app, ["app_key"]))
  });
});

// get app by id
appsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const app = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.id, id))
    .limit(1)
    .get();
  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }
  return c.json({
    data: omit(app, ["app_key"])
  });
});
// add domain and path prefix update route
const domainPathSchema = type({
  domain: type.string,
  path_prefix: type.string.or(type.null).default(null)
});
appsRouter.patch("/:id/domain", async (c) => {
  const id = c.req.param("id");
  const { domain, path_prefix } = domainPathSchema.assert(await c.req.json());

  await db
    .update(appsTable)
    .set({ domain, path_prefix })
    .where(eq(appsTable.id, id));
  return c.json({
    message: "App updated successfully"
  });
});

// enable disable app
const enableSchema = type({
  enabled: type.boolean
});
appsRouter.patch("/:id/enable", async (c) => {
  const id = c.req.param("id");
  const { enabled } = enableSchema.assert(await c.req.json());

  await db
    .update(appsTable)
    .set({ enabled: enabled ? 1 : 0 })
    .where(eq(appsTable.id, id));
  return c.json({
    message: "App enable status updated successfully"
  });
});

// get api key
appsRouter.get("/:id/app-key", async (c) => {
  const id = c.req.param("id");
  const app = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.id, id))
    .limit(1)
    .get();
  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }
  return c.json({
    api_key: app.app_key
  });
});
