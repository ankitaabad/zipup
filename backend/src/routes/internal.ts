import { INTERNAL_SOURCE } from "@backend/utils/constants";
import { errorHandler, Unauthorized } from "@backend/utils/errorHandler";
import { getLogger } from "@backend/utils/logger";
import { getRouteConfig } from "@backend/utils/routeConfig";
import { Hono } from "hono";

export const internalRouter = new Hono();

// get routes config for openresty
internalRouter.get("/routes", async (c) => {
  try {
    const logger = getLogger();
    logger.debug("get route config");
    // get X-Zipup-Internal

    //todo: add header check for internal request only.
    const routes = await getRouteConfig();
    logger.debug(JSON.stringify(routes));
    return c.json({ routes });
  } catch (error) {
    return errorHandler(c, error);
  }
});
