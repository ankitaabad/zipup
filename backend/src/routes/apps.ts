import {
  getAppWithLatestArtifact,
  getAppWithLatestArtifact,
  getArtifactWithApp
} from "@backend/utils/dbQueries";
import { generateApiKey } from "@backend/utils/secret";
import { Context, Hono } from "hono";
import { db } from "@backend/db/dbClient";
import { omit } from "radash";
import {
  appsTable,
  appSchema,
  envVarsTable,
  secretsTable
} from "@backend/db/schema";
import { generateId } from "@backend/utils/helper";
import { and, eq } from "drizzle-orm";
import { getLogger } from "@backend/utils/logger";
import { createSecretKey } from "@backend/utils/secret";
import { errorHandler } from "@backend/utils/errorHandler";
import {
  AppPatchSchema,
  AppStatus,
  CreateAppSchema,
  CreateEnvVarSchema,
  UpdateEnvVarSchema
} from "@common/index";
import { withErrorHandler } from "@backend/utils/middlewares";
import { isAppRunningByAppId } from "@backend/utils/docker_utils";
import { eventBus, zipupEvents } from "@backend/events/event";

export const appsRouter = new Hono();

appsRouter.post("/", async (c) => {
  //todo: wrap inside an error handler middleware
  const logger = getLogger();
  const { name, type } = CreateAppSchema.parse(await c.req.json());
  const app: typeof appSchema.infer = {
    id: generateId(),
    name,
    app_key: generateApiKey(),
    secret_key: createSecretKey(), //todo: encrypt and store
    type,
    start_command: null,
    is_enabled: true,
    private: true, // todo: should be set to true.
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // latest_version: null,
    domain: null,
    // path_prefix: null,
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
  try {
    const apps = await db.select().from(appsTable);
    return c.json({
      data: apps.map((app) => {
        const { app_key, secret_key, ...rest } = app;
        return {
          ...rest,
          api_key_suffix: app_key.slice(-4)
        };
      })
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});

// get app by id
appsRouter.get("/:id", async (c) => {
  try {
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
    const { app_key, secret_key, ...rest } = app;
    return c.json({
      data: { ...rest, api_key_suffix: app_key.slice(-4) }
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});

appsRouter.patch("/:app_id", async (c) => {
  try {
    const app_id = c.req.param("app_id");
    const { action, ...body } = AppPatchSchema.parse(await c.req.json());
    await db.update(appsTable).set(body).where(eq(appsTable.id, app_id));
    return c.json({
      message: "App updated successfully"
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});

appsRouter.delete(
  "/:app_id",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    // ensure that no running version before deleting the app
    const isAppRunning = await isAppRunningByAppId(app_id);
    if (isAppRunning) {
      return c.json({ error: "Please stop the app before deleting." }, 400);
    }

    eventBus.emit(zipupEvents.app_delete_initiated, { app_id });
    return c.json({
      message: "App deletion in progress."
    });
  })
);
appsRouter.post(
  "/:app_id/stop",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    // ensure that no running version before deleting the app
    const isAppRunning = await isAppRunningByAppId(app_id);
    if (!isAppRunning) {
      return c.json({ error: "App is not running." }, 400);
    }

    eventBus.emit(zipupEvents.app_stop_initiated, { app_id });
    return c.json({
      message: "App stopping in progress."
    });
  })
);

appsRouter.get("/:app_id/status", async (c) => {
  const app_id = c.req.param("app_id");

  const isAppRunning = await isAppRunningByAppId(app_id);
  if (isAppRunning) {
    return c.json({
      status: AppStatus.RUNNING
    });
  }
  const { app, artifact } = await getAppWithLatestArtifact(app_id);
  console.log({ app, artifact });
  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }
  let status = AppStatus.DRAFT;
  if (app.type === "STATIC") {
    if (artifact?.id) {
      status = AppStatus.DEPLOYABLE;
    } else {
      status = AppStatus.READY;
    }
  } else {
    if (app.start_command && artifact?.id) {
      status = AppStatus.DEPLOYABLE;
    } else if (app.start_command) {
      status = AppStatus.READY;
    }
  }
  return c.json({
    status
  });
});
appsRouter.post(
  "/:app_id/start",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    eventBus.emit(zipupEvents.deploy_latest_app, { app_id });
    return c.json({
      message: "App starting in progress."
    });
  })
);
// get api key
appsRouter.get(
  "/:id/app-key",
  withErrorHandler(async (c) => {
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
    const { app_key, secret_key } = app;
    return c.json({
      app_key,
      secret_key
    });
  })
);

// rotate app key and secret key
appsRouter.post(
  "/:id/rotate-keys",
  withErrorHandler(async (c) => {
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
    const new_app_key = generateApiKey();
    const new_secret_key = createSecretKey();
    await db
      .update(appsTable)
      .set({ app_key: new_app_key, secret_key: new_secret_key })
      .where(eq(appsTable.id, id));
    return c.json({
      message: "App key and Secret key rotated successfully",
      app_key: new_app_key,
      secret_key: new_secret_key
    });
  })
);

// env variables

appsRouter.get(
  "/:app_id/env-vars",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");

    const envs = await db
      .select()
      .from(envVarsTable)
      .where(eq(envVarsTable.app_id, app_id))
      .orderBy(envVarsTable.key);

    return c.json({
      data: envs
    });
  })
);

appsRouter.post(
  "/:appId/env-vars",
  withErrorHandler(async (c) => {
    const appId = c.req.param("appId");
    const logger = getLogger();

    const body = CreateEnvVarSchema.parse(await c.req.json());

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
      logger.error(err as Error);
      return c.json(
        { error: `Environment variable '${body.key}' already exists` },
        409
      );
    }

    return c.json({
      message: "Environment variable created",
      data: envVar
    });
  })
);

appsRouter.put(
  "/:appId/env-vars/:envId",
  withErrorHandler(async (c) => {
    const appId = c.req.param("appId");
    const envId = c.req.param("envId");

    const body = UpdateEnvVarSchema.parse(await c.req.json());

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
  })
);

appsRouter.delete(
  "/:appId/env-vars/:envId",
  withErrorHandler(async (c) => {
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
  })
);

// secrets api

// get all secrets for an app keys only, not values

appsRouter.get(
  "/:app_id/secrets/keys",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");

    const secrets = await db
      .select()
      .from(secretsTable)
      .where(eq(secretsTable.app_id, app_id))
      .orderBy(secretsTable.key);

    return c.json({
      data: secrets.map((secret) => ({
        id: secret.id,
        key: secret.key,
        created_at: secret.created_at,
        updated_at: secret.updated_at
      }))
    });
  })
);

appsRouter.get(
  "/:app_id/secrets/:secret_id",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    const secret_id = c.req.param("secret_id");

    const secret = await db
      .select()
      .from(secretsTable)
      .where(
        and(eq(secretsTable.id, secret_id), eq(secretsTable.app_id, app_id))
      )
      .limit(1)
      .get();

    if (!secret) {
      return c.json({ error: "Secret not found" }, 404);
    }
    //todo: decrypt the secret
    return c.json({
      data: secret
    });
  })
);

appsRouter.post(
  "/:app_id/secrets",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    const logger = getLogger();
    const body = CreateEnvVarSchema.parse(await c.req.json());
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
  })
);

//update secret
appsRouter.put(
  "/:app_id/secrets/:secret_id",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    const secret_id = c.req.param("secret_id");

    const body = UpdateEnvVarSchema.parse(await c.req.json());
    const result = await db
      .update(secretsTable)
      .set({
        value: body.value,
        updated_at: new Date().toISOString()
      })
      .where(
        and(eq(secretsTable.id, secret_id), eq(secretsTable.app_id, app_id))
      )
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Secret variable not found" }, 404);
    }

    return c.json({
      message: "Secret variable updated",
      data: result[0]
    });
  })
);

//delete secret
appsRouter.delete(
  "/:app_id/secrets/:secret_id",
  withErrorHandler(async (c) => {
    const app_id = c.req.param("app_id");
    const secret_id = c.req.param("secret_id");

    const result = await db
      .delete(secretsTable)
      .where(
        and(eq(secretsTable.id, secret_id), eq(secretsTable.app_id, app_id))
      )
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Secret variable not found" }, 404);
    }
    return c.json({
      message: "Secret variable deleted"
    });
  })
);
