import { describe, it, expect } from "vitest";
import { artifactsRouter, deploymentsRouter } from "../src/routes/artifact";

describe("Deploy app test", () => {
  it("deploys an app", async () => {
    const res = await artifactsRouter.fetch(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: "test_app_1234567890" })
      })
    );
    const result = await res.json();
    expect(result).toMatchInlineSnapshot(`
      {
        "artifact_id": "37MV6tGcRZiFuyQ0DaEBFWzEYgK",
        "upload_url": "/uploads/37MV6tGcRZiFuyQ0DaEBFWzEYgK",
        "version": 2,
      }
    `);
  });
});
