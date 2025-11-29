import { apps, appSchema } from "./src/db/schema";
import { serve } from "@hono/node-server";
import { type } from "arktype";
import { Hono } from "hono";
import KSUID from "ksuid";
import { db, generateApiKey } from "./utils";
import { omit } from "radash";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const createAppSchema = type({
  name: type.string,
  type: type.enumerated("static", "dynamic")
});
const generateId = () => {
  return KSUID.randomSync().string;
};
app.post("/apps", async (c) => {
  const { name, type } = createAppSchema.assert(c.req.json());
  const app: typeof appSchema.infer = {
    id: generateId(),
    name,
    api_key: generateApiKey(),
    type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  const result = await db.insert(apps).values(app);
  console.log({ result });
  return c.json({
    message: "App created successfully",
    app: omit(app, ["api_key"])
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
