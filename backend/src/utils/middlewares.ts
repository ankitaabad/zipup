import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { CookieType, ISSUER, TokenPurpose } from "./constants";
import { V4 } from "paseto";
import { paseto_public, TokenPayload } from "./helper";
import { errorHandler } from "./errorHandler";
import { Context, Hono } from "hono";
const loginPath = "/admin/login";
const refreshTokenPath = "/admin/refresh";

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
    payload.purpose !== expectedPurpose ||
    payload.iss !== ISSUER ||
    exp < now
  ) {
    return null;
  }

  return payload;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const { method, path } = c.req;
  console.log({ method, path });

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
