import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { adminAuthRouter } from "./routes/adminAuth";
import { appsRouter } from "./routes/apps";
import { settingsRouter } from "./routes/settings";
import { artifactsRouter } from "./routes/artifact";
import { loggerMiddleware } from "./utils/logger";
import { statsRouter } from "./routes/stats";
import { authMiddleware } from "./utils/middlewares";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";
import { internalRouter } from "./routes/internal";


const frontendDir =
  process.env.FRONTEND_DIST_DIR ?? path.resolve(__dirname,"../frontend/dist");

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
app.use("/api/*", (c, next) => authMiddleware(c, next));
app.route("/api/admin", adminAuthRouter);
app.route("/api/apps", appsRouter);
app.route("/api/global_config", settingsRouter);
app.route("/api/artifacts", artifactsRouter);
app.route("/api/stats", statsRouter);
app.get("*", async (c) => {
  const indexHtml = await fs.promises.readFile(
    path.join(frontendDir, "index.html"),
    "utf-8"
  );

  c.header("Cache-Control", "no-cache");
  return c.html(indexHtml);
});
serve(
  {
    fetch: app.fetch,
    port: 8080
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
