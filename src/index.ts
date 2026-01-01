import { serve } from "@hono/node-server";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRouter } from "./routes/auth";
import { appsRouter } from "./routes/apps";
import { globalConfigRouter } from "./routes/globalConfig";
import { artifactsRouter } from "./routes/artifact";
import { loggerMiddleware } from "./utils/logger";
const app = new Hono();
app.use(
  "*",
  cors({
    origin: "http://localhost:5173", // your frontend
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);
app.use("*", loggerMiddleware());
app.route("/auth", authRouter);
app.route("/apps", appsRouter);
app.route("/global_config", globalConfigRouter);
app.route("/artifacts", artifactsRouter);

serve(
  {
    fetch: app.fetch,
    port: 3000
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
