import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema, envVarsTable, secretsTable } from "../db/schema";
import { generateId } from "../utils/helper";
import { and, eq } from "drizzle-orm";
import { getLogger } from "../utils/logger";
import { getDockerStats } from "../utils/docker_utils";

export const statsRouter = new Hono();
statsRouter.get("/", async (c) => {
  const stats = await getDockerStats();
  return c.json({
    data: stats
  });
});
