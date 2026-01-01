import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema, envVarsTable, secretsTable } from "../db/schema";
import { generateId } from "../utils/helper";
import { and, eq } from "drizzle-orm";
import { getLogger } from "../utils/logger";

export const appsRouter = new Hono();
const createAppSchema = type({
  name: type.string,
  type: type.enumerated("STATIC", "DYNAMIC"),
  start_command: type.string,
  internal_port: type.number
});

appsRouter.post("/", async (c) => {
  //todo: wrap inside an error handler middleware
  const logger = getLogger();
  const { name, type, start_command, internal_port } = createAppSchema.assert(
    await c.req.json()
  );
  const app: typeof appSchema.infer = {
    id: generateId(),
    name,
    app_key: generateApiKey(),
    type,
    start_command,
    is_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // latest_version: null,
    domain: null,
    path_prefix: null,
    redis_prefix: null,
    redis_username: null,
    redis_password: null
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
    data: apps.map((app) => {
      const { app_key, ...rest } = app;
      return {
        ...rest,
        api_key_suffix: app_key.slice(-4)
      };
    })
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
  const { app_key, ...rest } = app;
  return c.json({
    data: { ...rest, api_key_suffix: app_key.slice(-4) }
  });
});

const appPatchArk = type({
  action: "'UpdateDomain'",
  domain: "string",
  path: "string"
})
  .or(
    type({
      action: "'UpdateStartCommand'",
      start_command: "string"
    })
  )
  .or(
    type({
      action: "'UpdateAppName'",
      name: "string"
    })
  );
appsRouter.patch("/:app_id", async (c) => {
  const app_id = c.req.param("app_id");
  const { action, ...body } = appPatchArk.assert(await c.req.json());
  await db.update(appsTable).set(body).where(eq(appsTable.id, app_id));
  return c.json({
    message: "App updated successfully"
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

// env variables

appsRouter.get("/:app_id/env-vars", async (c) => {
  const app_id = c.req.param("app_id");

  const envs = await db
    .select()
    .from(envVarsTable)
    .where(eq(envVarsTable.app_id, app_id))
    .orderBy(envVarsTable.key);

  return c.json({
    data: envs
  });
});

export const envKeySchema = type(/^[A-Z_][A-Z0-9_]*$/);

export const createEnvVarSchema = type({
  key: envKeySchema,
  value: "string"
});

export const updateEnvVarSchema = type({
  value: "string"
});

appsRouter.post("/:appId/env-vars", async (c) => {
  const appId = c.req.param("appId");
  const logger = getLogger();

  const body = createEnvVarSchema.assert(await c.req.json());

  const now = new Date().toISOString();

  const envVar = {
    id: generateId(),
    app_id: appId,
    key: body.key,
    value: body.value,
    created_at: now,
    updated_at: now
  };

  try {
    await db.insert(envVarsTable).values(envVar);
  } catch (err) {
    logger.error(err);
    return c.json(
      { error: `Environment variable '${body.key}' already exists` },
      409
    );
  }

  return c.json({
    message: "Environment variable created",
    data: envVar
  });
});

appsRouter.put("/:appId/env-vars/:envId", async (c) => {
  const appId = c.req.param("appId");
  const envId = c.req.param("envId");

  const body = updateEnvVarSchema.assert(await c.req.json());

  const result = await db
    .update(envVarsTable)
    .set({
      value: body.value,
      updated_at: new Date().toISOString()
    })
    .where(and(eq(envVarsTable.id, envId), eq(envVarsTable.app_id, appId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Environment variable not found" }, 404);
  }

  return c.json({
    message: "Environment variable updated",
    data: result[0]
  });
});

appsRouter.delete("/:appId/env-vars/:envId", async (c) => {
  const appId = c.req.param("appId");
  const envId = c.req.param("envId");

  const result = await db
    .delete(envVarsTable)
    .where(and(eq(envVarsTable.id, envId), eq(envVarsTable.app_id, appId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Environment variable not found" }, 404);
  }

  return c.json({
    message: "Environment variable deleted"
  });
});

// secrets api

appsRouter.get("/:app_id/secrets/:secret_id", async (c) => {
  const app_id = c.req.param("app_id");
  const secret_id = c.req.param("secret_id");

  const secret = await db
    .select()
    .from(envVarsTable)
    .where(and(eq(envVarsTable.id, secret_id), eq(envVarsTable.app_id, app_id)))
    .limit(1)
    .get();

  if (!secret) {
    return c.json({ error: "Secret not found" }, 404);
  }
  //todo: decrypt the secret
  return c.json({
    data: secret
  });
});

export const createSecretSchema = type({
  key: envKeySchema,
  value: "string"
});

export const updateSecretSchema = type({
  value: "string"
});

appsRouter.post("/:app_id/secrets", async (c) => {
  const app_id = c.req.param("app_id");
  const logger = getLogger();
  const body = createSecretSchema.assert(await c.req.json());
  const now = new Date().toISOString();
  //todo: encrypt the secret later
  const secret = {
    id: generateId(),
    app_id,
    key: body.key,
    value: body.value,
    created_at: now,
    updated_at: now
  };

  try {
    await db.insert(secretsTable).values(secret);
  } catch (err) {
    logger.error(err);
    return c.json(
      { error: `Secret variable '${body.key}' already exists` },
      409
    );
  }
  return c.json({
    message: "Secret variable created",
    data: secret
  });
});

//update secret
appsRouter.put("/:app_id/secrets/:secret_id", async (c) => {
  const app_id = c.req.param("app_id");
  const secret_id = c.req.param("secret_id");

  const body = updateSecretSchema.assert(await c.req.json());
  const result = await db
    .update(secretsTable)
    .set({
      value: body.value,
      updated_at: new Date().toISOString()
    })
    .where(and(eq(secretsTable.id, secret_id), eq(secretsTable.app_id, app_id)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Secret variable not found" }, 404);
  }

  return c.json({
    message: "Secret variable updated",
    data: result[0]
  });
});

//delete secret
appsRouter.delete("/:app_id/secrets/:secret_id", async (c) => {
  const app_id = c.req.param("app_id");
  const secret_id = c.req.param("secret_id");

  const result = await db
    .delete(secretsTable)
    .where(and(eq(secretsTable.id, secret_id), eq(secretsTable.app_id, app_id)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Secret variable not found" }, 404);
  }
  return c.json({
    message: "Secret variable deleted"
  });
});
