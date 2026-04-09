import { settingsTable } from "./../db/schema";
import { appsTable } from "@backend/db/schema";
import { db } from "@backend/db/dbClient";
import { errorHandler } from "@backend/utils/errorHandler";
import { getLogger } from "@backend/utils/logger";
import { getRouteConfig, parseDomain } from "@backend/utils/routeConfig";
import { Hono } from "hono";
import { eq } from "drizzle-orm";

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

internalRouter.get("/domain-whitelist", async (c) => {
  const logger = getLogger();
  logger.debug("get domain whitelist");
  const [apps, adminConsoleDomain] = await Promise.all([
    await db.select().from(appsTable).all(),
    db.select().from(settingsTable).where(eq(settingsTable.key, "domain")).get()
  ]);

  const domains = apps
    .map((app) => app.domain)
    .filter((domain): domain is string => !!domain);
  if (adminConsoleDomain?.value) {
    domains.push(adminConsoleDomain.value);
  }
  const whitelistedDomains: string[] = [];
  domains.forEach((domain) => {
    try {
      const { host } = parseDomain(domain);
      whitelistedDomains.push(host);
    } catch (error) {
      logger.error(`Error parsing domain: ${domain}`);
    }
  });
  logger.debug(`parsed domains: ${JSON.stringify(whitelistedDomains)}`);
  return c.json({ domains: whitelistedDomains });
});
