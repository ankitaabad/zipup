import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { adminAuthRouter } from "./routes/adminAuth";
import { appsRouter } from "./routes/apps";
import { settingsRouter } from "./routes/settings";
import { artifactsRouter } from "./routes/artifact";
import { loggerMiddleware } from "./utils/logger";
import { statsRouter } from "./routes/stats";
import { appKeyAuthMiddleware, authMiddleware } from "./utils/middlewares";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";

import fs from "fs";
import { internalRouter } from "./routes/internal";
import { wireguardRouter } from "./routes/wireguard";
import { ensureServerWireguardPeer } from "./utils/helper";
import { getEncryptionKey, getLatestPasetoKeys } from "./utils/tokenKeys";
import { deploymentRouter } from "./routes/deployment";

const frontendDir =
  process.env.FRONTEND_DIST_DIR ?? path.resolve(__dirname, "../frontend/dist");

const app = new Hono();
app.use(secureHeaders());
app.use(
  "/assets/*",
  serveStatic({
    root: frontendDir,
    onFound: (_, c) => {
      c.header("Cache-Control", "public, max-age=31536000, immutable");
    }
  })
);

//todo: only same origin.
// app.use(
//   "*",
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//     allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
//     allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
//   })
// );

app.use("/api/*", loggerMiddleware());
app.route("/api/__zipup_internal__", internalRouter);
app.use("/api/artifacts/*", appKeyAuthMiddleware);
app.use("/api/deployment/*", appKeyAuthMiddleware);
app.route("/api/deployments", deploymentRouter);
app.route("/api/artifacts", artifactsRouter);
app.use("/api/*", (c, next) => authMiddleware(c, next));
app.route("/api/admin", adminAuthRouter);
app.route("/api/apps", appsRouter);
app.route("/api/settings", settingsRouter);
app.route("/api/stats", statsRouter);
app.route("/api/wireguard", wireguardRouter);
app.get("*", async (c) => {
  const indexHtml = await fs.promises.readFile(
    path.join(frontendDir, "index.html"),
    "utf-8"
  );

  c.header("Cache-Control", "no-cache");
  return c.html(indexHtml);
});

async function main() {
  await Promise.all([
    getLatestPasetoKeys(),
    ensureServerWireguardPeer(),
    getEncryptionKey()
  ]);
  
  serve(
    {
      fetch: app.fetch,
      port: 8080
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    }
  );
}
main();
