import { Hono } from "hono";
import { omit } from "radash";
import { appsTable, appSchema, platformAdminsTable } from "../db/schema";
import {
  ACCESS_AUD,
  addAllTokensToCookie,
  consumeRefreshJti,
  generateAccessToken,
  generateCSRFToken,
  generateId,
  generateRefreshToken,
  hashPassword,
  mustBeTrue,
  REFRESH_AUD,
  TokenPayload,
  verifyAccessToken,
  verifyPasswordHash,
  verifyPasswordStrength,
  verifyRefreshToken
} from "../utils/helper";
import { eq } from "drizzle-orm";
import { setCookie, getCookie } from "hono/cookie";
import { getLogger } from "../utils/logger";
import { db } from "@backend/db/dbClient";
import { AdminChangePasswordSchema, AdminLoginSchema } from "@zipup/common";
import { CookieType } from "@backend/utils/constants";
import {
  createAuthenticatedRouter,
  withErrorHandler
} from "@backend/utils/middlewares";
export const adminAuthRouter = createAuthenticatedRouter();

adminAuthRouter.post(
  "/login",
  withErrorHandler(async (c) => {
    const protocol = c.header("x-forwarded-proto");
    console.log({ protocol });
    const logger = getLogger();

    logger.debug("Login attempt");
    const { username, password } = AdminLoginSchema.parse(await c.req.json());
    const user = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.username, username))
      .limit(1)
      .get();
    if (!user) {
      logger.error("Login failed: User not found", { username });
      return c.json({ error: "Invalid username or password" }, 401);
    }
    logger.debug("User found, verifying password", { username });
    const isPasswordValid = await verifyPasswordHash(
      user.password_hash,
      password
    );
    logger.debug("Password verification result", { isPasswordValid });
    if (!isPasswordValid) {
      return c.json({ error: "Invalid username or password" }, 401);
    }
    await addAllTokensToCookie(c, user.id);
    return c.json({});
  })
);

adminAuthRouter.post(
  "/logout",
  withErrorHandler(async (c) => {
    const logger = getLogger();

    // optional: revoke refresh token in DB if you store them
    setCookie(c, "access_token", "", {
      httpOnly: true,
      secure: true,
      maxAge: 0
    });
    setCookie(c, "refresh_token", "", {
      httpOnly: true,
      secure: true,
      maxAge: 0
    });

    return c.json({});
  })
);

adminAuthRouter.post(
  "/refresh",
  withErrorHandler(async (c) => {
    const refreshToken = getCookie(c, "refresh_token");

    if (!refreshToken) {
      return c.json({ error: "Missing refresh token" }, 401);
    }

    let payload = c.get("tokenPayload");
    if (!payload.jti) {
      throw new Error("Missing jti");
    }
    const consumed = consumeRefreshJti(payload.jti);
    if (!consumed) {
      throw new Error("Refresh token already used or invalid");
    }
    await addAllTokensToCookie(c, payload.sub);

    return c.json({});
  })
);

adminAuthRouter.get(
  "/verify",
  withErrorHandler(async (c) => {
    const accessToken =
      getCookie(c, "access_token") ??
      c.req.header("authorization")?.replace("Bearer ", "");

    if (!accessToken) {
      return c.text("Unauthorized", 401);
    }

    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await db
      .select({
        id: platformAdminsTable.id,
        username: platformAdminsTable.username
        // is_admin: platformAdminsTable.is_admin
      })
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.id, payload.sub))
      .limit(1)
      .get();

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Forward identity to upstream app
    c.header("X-User-Id", user.id);
    c.header("X-User-Name", user.username);
    // c.header("X-User-Role", user.is_admin ? "admin" : "user");

    return c.json({ message: "User verified" }, 200);
  })
);

adminAuthRouter.post(
  "/change-password",
  withErrorHandler(async (c) => {
    const logger = getLogger();
    logger.debug("Change password attempt");
    const { new_password } = AdminChangePasswordSchema.parse(
      await c.req.json()
    );
    const isStrong = await verifyPasswordStrength(new_password);
    logger.debug("Password strength verification result", { isStrong });
    mustBeTrue(isStrong, "Password is not strong.");
    const tokenPayload = c.get("tokenPayload");

    const user = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.id, tokenPayload.sub))
      .limit(1)
      .get();

    if (!user) {
      logger.debug("User not found", { user_id: tokenPayload.sub });
      return c.json({ error: "User not found" }, 404);
    }
    logger.debug("User found", { user_id: user.id });
    const newHash = await hashPassword(new_password);

    await db
      .update(platformAdminsTable)
      .set({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .where(eq(platformAdminsTable.id, user.id));
    logger.debug("Password changed successfully", { user_id: user.id });
    // Optional: force logout everywhere, in case multiple users
    setCookie(c, CookieType.ACCESS_TOKEN, "", { maxAge: 0 });
    setCookie(c, CookieType.REFRESH_TOKEN, "", { maxAge: 0 });

    // redirect to login page on frontend
    c.set("Location", "/login");
    c.status(302);
    return c.json({ message: "Password changed successfully" });
  })
);
