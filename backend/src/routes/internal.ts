import { getLogger } from "@backend/utils/logger";
import { getRouteConfig } from "@backend/utils/routeConfig";
import { Hono } from "hono";

export const internalRouter = new Hono();

// get routes config for openresty
internalRouter.get("/routes", async (c) => {
  const logger = getLogger();
  logger.debug("get route config");
  // get X-Zipup-Internal
  const isInternal = c.req.header("X-Zipup-Internal");
  console.log(`isInternal : ${isInternal}`);
  logger.debug(`isInternal : ${isInternal}`);
  //todo: add header check for internal request only.
  const routes = await getRouteConfig();
  logger.debug(JSON.stringify(routes));
  return c.json({routes});
});
