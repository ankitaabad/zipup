import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { faker } from "@faker-js/faker";
import { appsRouter } from "../src/routes/apps";
import { omit } from "radash";
import { authRouter } from "../src/routes/auth";
// vi.mock("ksuid", () => {
//   return {
//     default: {
//       randomSync: () => ({
//         string: "test_ksuid_1234567890"
//       })
//     }
//   };
// });
describe("Sample Test", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("creates an app", async () => {
    const res = await appsRouter.fetch(
      new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "docs", type: "static" })
      })
    );
    const result = await res.json();
  });
  it("registers a user and logs in", async () => {
    // Register user
    const username = faker.person.firstName();
    const password = faker.internet.password({ length: 12 });
    const registerRes = await authRouter.fetch(
      new Request("http://localhost/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, isAdmin: true })
      })
    );
    expect(registerRes.status).toBe(200);
    const registerData = await registerRes.json();
    expect(registerData.message).toBe("User registered successfully");

    // Login user
    const loginRes = await authRouter.fetch(
      new Request("http://localhost/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
    );
    // check cookies are set
    const rawSetCookie = loginRes.headers.get("set-cookie")!;
    const cookieHeader = rawSetCookie
      .split(", ")
      .map((c) => c.split(";")[0])
      .join("; ");

    // const setCookie = loginRes.headers.get("set-cookie");
    // expect(setCookie).not.toBeNull();
    // expect(setCookie as string).toContain("access_token");
    // expect(setCookie as string).toContain("refresh_token");
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.message).toBe("Login successful");
    // refresh token
    const refreshRes = await authRouter.fetch(
      new Request("http://localhost/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader as string
        }
      })
    );
    expect(refreshRes.status).toBe(200);
    const refreshData = await refreshRes.json();
    expect(refreshData.message).toBe("Token refreshed");
  });
});
