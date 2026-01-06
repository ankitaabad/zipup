import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { adminAuthRouter } from "./routes/adminAuth";
import { appsRouter } from "./routes/apps";
import { globalConfigRouter } from "./routes/globalConfig";
import { artifactsRouter } from "./routes/artifact";
import { loggerMiddleware } from "./utils/logger";
import { statsRouter } from "./routes/stats";
import { authMiddleware } from "./utils/middlewares";
const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"]
  })
);

app.use("*", loggerMiddleware());
app.use("*", (c, next) => authMiddleware(c, next));
app.route("/admin", adminAuthRouter);
app.route("/apps", appsRouter);
app.route("/global_config", globalConfigRouter);
app.route("/artifacts", artifactsRouter);
app.route("/stats", statsRouter);
serve(
  {
    fetch: app.fetch,
    port: 3000
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
