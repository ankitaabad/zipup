import { apps, appSchema } from "./src/db/schema";
import { serve } from "@hono/node-server";
import { type } from "arktype";
import { Hono } from "hono";
import KSUID from "ksuid";
import { db, generateApiKey } from "./utils";
import { omit } from "radash";
import SenseLogs from 'senselogs'
const app = new Hono();


const log = new SenseLogs()
// const createAppSchema = type({
//   name: type.string,
//   type: type.enumerated("static", "dynamic")
// });
const generateId = () => {
  return KSUID.randomSync().string;
};
app.get("/", async (c) => {
  log.info("Received request to create app");

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
