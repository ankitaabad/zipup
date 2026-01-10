import { Hono } from "hono";
import { getDockerStats } from "../utils/docker_utils";
import { errorHandler } from "../utils/errorHandler";

export const statsRouter = new Hono();
statsRouter.get("/", async (c) => {
  try {
    const stats = await getDockerStats();
    return c.json({
      data: stats
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});
