import { apps, appSchema } from "./src/db/schema";
import { serve } from "@hono/node-server";
import { type } from "arktype";
import { Hono } from "hono";
import KSUID from "ksuid";
import { db, generateApiKey } from "./utils";
import { omit } from "radash";
import SenseLogs from "senselogs";
const app = new Hono();

const log = new SenseLogs();
// const createAppSchema = type({
//   name: type.string,
//   type: type.enumerated("static", "dynamic")
// });
const generateId = () => {
  return KSUID.randomSync().string;
};
app.get("/", async (c) => {
  const requestId = generateId();
  log.addContext({ requestId });
  log.info("Received newest request to create app");
  log.error("This is a test error log");
  return c.json({
    message: "App created successfully"
  });
});

serve(
  {
    fetch: app.fetch,
    port: 3000
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
