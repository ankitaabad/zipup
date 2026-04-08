import fs from "fs";
import { desc, eq } from "drizzle-orm";
import { db } from "@backend/db/dbClient";
import { appsTable, deploymentsTable, settingsTable } from "../db/schema";
import { getLogger } from "./logger";
import { envVar, PORT_FOR_USER_APPS } from "./constants";

export const updateRouteConfig = async () => {
  const logger = getLogger();
  logger.debug("Updating route config");
  const apps = await db.select().from(appsTable);
  logger.debug(JSON.stringify(apps));
  const routes = [];
  await Promise.all(
    apps.map(async (app) => {
      // get latest deployment of the app
      //todo: get all latest deployment for all apps in one db call
      if (app.name === "zipup") {
        return;
      }
      const latestDeployment = await db
        .select()
        .from(deploymentsTable)
        .where(eq(deploymentsTable.app_id, app.id))
        .orderBy(desc(deploymentsTable.created_at))
        .limit(1)
        .get();
      if (!latestDeployment) {
        logger.debug(`No deployment found for app ${app.name}`);
        return;
      }
      const { artifact_id } = latestDeployment;
      if (app.type === "STATIC") {
        const { domain, path_prefix } = app;
        if (!domain) {
          logger.debug(`No domain found for app ${app.name}`);
          return;
        }
        if (!artifact_id) {
          logger.debug(`No artifact found for app ${app.name}`);
          return;
        }
        routes.push({
          host: domain,
          path: path_prefix || "/",
          type: "static",
          artifact_id,
          port: PORT_FOR_USER_APPS
        });
        logger.debug(JSON.stringify(routes));
        // write to config/routes.json
        fs.writeFileSync("/config/routes.json", JSON.stringify({ routes }));
      } else if (app.type === "DYNAMIC") {
        //todo: need to implement
        const { domain, path_prefix } = app;
        const upstream = `http://${latestDeployment.container_name}:${PORT_FOR_USER_APPS}`;
        logger.debug(`upstream : ${upstream}`);
        if (!domain) {
          logger.debug(`No domain found for app ${app.name}`);
          return;
        }
        routes.push({
          host: domain,
          path: path_prefix || "/",
          "type": "dynamic",
          "upstream": upstream,
          "auth_required": false
        });
        logger.debug("routes after push : " + JSON.stringify(routes));
        return;
      }
    })
  );
  logger.debug(`Routes config : ${JSON.stringify(routes)}`);
  // fs.writeFileSync("/config/routes.json", JSON.stringify({ routes }));
};
export const parseDomain = (domain: string) => {
  const url = new URL(`http://${domain}`);

  return {
    host: url.hostname,
    path: url.pathname || "/"
  };
};
export const getRouteConfig = async () => {
  const logger = getLogger();
  logger.debug("get route config");
  const apps = await db.select().from(appsTable);
  logger.debug(JSON.stringify(apps));
  // const ip = await publicIpv4();
  // logger.debug(`Public IP: ${ip}`);
  const routes = [];
  const result = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "domain"))
    .get();
  if (result?.value) {
    const { host, path } = parseDomain(result.value);

    routes.push({
      host,
      path,
      "type": "dynamic",
      "upstream": `http://zipup:${PORT_FOR_USER_APPS}`,
      "auth_required": false
    });
  }

  await Promise.all(
    apps.map(async (app) => {
      // get latest deployment of the app
      //todo: get all latest deployment for all apps in one db call
      if (app.name === "zipup") {
        return;
      }
      const latestDeployment = await db
        .select()
        .from(deploymentsTable)
        .where(eq(deploymentsTable.app_id, app.id))
        .orderBy(desc(deploymentsTable.created_at))
        .limit(1)
        .get();
      if (!latestDeployment) {
        logger.debug(`No deployment found for app ${app.name}`);
        return;
      }
      const { artifact_id } = latestDeployment;
      const { domain } = app;
      if (!domain) {
        logger.debug(`No domain found for app ${app.name}`);
        return;
      }
      const { host, path } = parseDomain(domain);
      if (app.type === "STATIC") {
        if (!artifact_id) {
          logger.debug(`No artifact found for app ${app.name}`);
          return;
        }
        routes.push({
          host,
          path,
          // path: path_prefix || "/",
          type: "static",
          artifact_id,
          port: PORT_FOR_USER_APPS
        });
        logger.debug(JSON.stringify(routes));
      } else if (app.type === "DYNAMIC") {
        //todo: need to implement
        const upstream = `http://${latestDeployment.container_name}:${PORT_FOR_USER_APPS}`;
        logger.debug(`upstream : ${upstream}`);
        if (!domain) {
          logger.debug(`No domain found for app ${app.name}`);
          return;
        }
        routes.push({
          host,
          path,
          "type": "dynamic",
          "upstream": upstream,
          "auth_required": false
        });
        logger.debug("routes after push : " + JSON.stringify(routes));
        return;
      }
    })
  );
  logger.debug(`Routes config : ${JSON.stringify(routes)}`);
  return routes;
};
