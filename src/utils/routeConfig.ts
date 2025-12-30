import fs from "fs";
import { desc, eq } from "drizzle-orm";
import { db } from "../../utils";
import { appsTable, deploymentsTable } from "../db/schema";
import { getLogger } from "./logger";
import { portForUserApps } from "./constants";

export const updateRouteConfig = async () => {
  const logger = getLogger();
  logger.debug("Updating route config");
  const apps = await db.select().from(appsTable);
  logger.debug(JSON.stringify(apps));
  const routes = [
    {
      "host": "localhost",
      "path": "/",
      "type": "dynamic",
      "upstream": "http://passup:3000",
      "auth_required": false
    }
  ];
  await Promise.all(
    apps.map(async (app) => {
      // get latest deployment of the app
      //todo: get all latest deployment for all apps in one db call
      if (app.name === "passup") {
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
      const { artifact_id, host_port } = latestDeployment;
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
          port: host_port
        });
        logger.debug(JSON.stringify(routes));
        // write to config/routes.json
        fs.writeFileSync("/config/routes.json", JSON.stringify({ routes }));
      } else if (app.type === "DYNAMIC") {
        //todo: need to implement
        const { domain, path_prefix } = app;
        const upstream = `http://${latestDeployment.container_name}:${portForUserApps}`;
        logger.debug(`upstream : ${upstream}`);

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
  fs.writeFileSync("/config/routes.json", JSON.stringify({ routes }));
};
