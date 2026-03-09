import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { AUD, CookieType, ISSUER, TokenPurpose } from "./constants";
import { V4 } from "paseto";
import { paseto_public, TokenPayload } from "./helper";
import { errorHandler } from "./errorHandler";
import { Context, Hono } from "hono";
import { getLogger } from "./logger";
import { eq } from "drizzle-orm";
import { appsTable } from "@backend/db/schema";
import { db } from "@backend/db/dbClient";
import { appSchema } from "@backend/db/schema";
import z from "zod";
const loginPath = "/api/admin/login";
const refreshTokenPath = "/api/admin/refresh";

async function verifyPasetoToken(
  token: string | undefined,
  expectedPurpose: TokenPurpose
): Promise<TokenPayload | null> {
  if (!token) return null;

  let payload: TokenPayload;
  try {
    payload = (await V4.verify(token, paseto_public as string)) as TokenPayload;
  } catch {
    return null;
  }

  const now = Date.now();
  const exp = new Date(payload.exp).getTime();

  if (
    payload.aud !== AUD.ZIPUP_API ||
    payload.purpose !== expectedPurpose ||
    payload.iss !== ISSUER ||
    exp < now
  ) {
    return null;
  }

  return payload;
}
export const appKeyAuthMiddleware = createMiddleware(async (c, next) => {
  const logger = getLogger();
  const appKey = c.req.header("Zipup-App-Key");
  if (!appKey) {
    logger.error("Unauthorized: No app key provided");
    return c.json({ error: "Unauthorized" }, 401);
  }
  const app = await db
    .select()
    .from(appsTable)
    .where(eq(appsTable.app_key, appKey))
    .get();
  if (!app) {
    logger.error("Unauthorized: Invalid app key", { appKey });
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("app", app);
  await next();
});
export const authMiddleware = createMiddleware(async (c, next) => {
  const { method, path } = c.req;
  const logger = getLogger();
  logger.debug("Method and path", { method, path });

  // 1️⃣ Login route → no auth
  if (path === loginPath) {
    await next();
    return;
  }

  // 2️⃣ Refresh route → verify refresh token
  if (path === refreshTokenPath) {
    const payload = await verifyPasetoToken(
      getCookie(c, CookieType.REFRESH_TOKEN),
      TokenPurpose.REFRESH
    );

    if (!payload) return c.json({ error: "Unauthorized" }, 401);
    c.set("tokenPayload", payload);
    await next();
    return;
  }

  // 3️⃣ State-changing methods → verify CSRF token
  const stateChangingMethods = ["POST", "PATCH", "PUT", "DELETE"];
  if (stateChangingMethods.includes(method)) {
    const csrfTokenFromCookie = getCookie(c, CookieType.CSRF_TOKEN);
    const csrfTokenFromHeader = c.req.header("X-CSRF-TOKEN");
    if (
      !csrfTokenFromCookie &&
      !csrfTokenFromHeader &&
      csrfTokenFromCookie !== csrfTokenFromHeader
    ) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const csrfPayload = await verifyPasetoToken(
      csrfTokenFromCookie,
      TokenPurpose.CSRF
    );

    if (!csrfPayload) return c.json({ error: "Unauthorized" }, 401);
  }

  // 4️⃣ Verify access token for all other routes
  const accessPayload = await verifyPasetoToken(
    getCookie(c, CookieType.ACCESS_TOKEN),
    TokenPurpose.ACCESS
  );

  if (!accessPayload) return c.json({ error: "Unauthorized" }, 401);

  // Attach payload if needed
  c.set("tokenPayload", accessPayload);

  await next();
});

export const withErrorHandler =
  <C extends Context>(handler: (c: C) => Promise<Response>) =>
  async (c: C): Promise<Response> => {
    try {
      return await handler(c);
    } catch (err) {
      return errorHandler(c, err);
    }
  };

export const createAuthenticatedRouter = () =>
  new Hono<{
    Variables: {
      tokenPayload: TokenPayload;
    };
  }>();

export const createAppKeyAuthenticatedRouter = () =>
  new Hono<{
    Variables: {
      app: z.infer<typeof appSchema> ;
    };
  }>();
