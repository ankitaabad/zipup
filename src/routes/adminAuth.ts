import { type } from "arktype";
import { Hono } from "hono";
import { db, generateApiKey } from "../../utils";
import { omit } from "radash";
import { appsTable, appSchema, platformAdminsTable } from "../db/schema";
import {
  ACCESS_AUD,
  generateAccessToken,
  generateCSRFToken,
  generateId,
  generateRefreshToken,
  hashPassword,
  REFRESH_AUD,
  verifyAccessToken,
  verifyPasswordHash,
  verifyPasswordStrength,
  verifyRefreshToken
} from "../utils/helper";
import { eq } from "drizzle-orm";
import { setCookie, getCookie } from "hono/cookie";
import { getLogger } from "../utils/logger";
import { errorHandler } from "../utils/errorHandler";
export const adminAuthRouter = new Hono();

const registerSchema = type({
  username: type.string,
  password: type.string
});
// todo: add auth  middleware for protected routes
adminAuthRouter.post("/register", async (c) => {
  return c.json({ message: "blocked for now" });
  const logger = getLogger();
  logger.info("Register attempt");
  const { username, password } = await c.req.json();
  const isValid = await verifyPasswordStrength(password);
  if (!isValid) {
    return c.json({ error: "Password is not strong enough" }, 400);
  }
  // check if user already exists
  const existingUser = await db
    .select()
    .from(platformAdminsTable)
    .where(eq(platformAdminsTable.username, username))
    .limit(1)
    .execute();
  if (existingUser.length > 0) {
    return c.json({ error: "User already exists" }, 400);
  }
  // if(isAdmin){
  //   // check if there is any admin user already
  //   const adminUser = await db
  //     .select()
  //     .from(platformAdminsTable)
  //     .where(eq(platformAdminsTable.is_admin, 1))
  //     .limit(1)
  //     .execute();
  //   if (adminUser.length > 0) {
  //     return c.json({ error: "Admin user already exists" }, 400);
  //   }
  // }
  const password_hash = await hashPassword(password);
  const user = {
    id: generateId(),
    username,
    password_hash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_admin: 0
  };
  await db.insert(platformAdminsTable).values(user);
  return c.json({
    message: "User registered successfully",
    data: omit(user, ["password_hash"])
  });
});

adminAuthRouter.post("/login", async (c) => {
  try {
    const protocol = c.header("x-forwarded-proto");
    console.log({ protocol });
    const logger = getLogger();

    logger.debug("Login attempt");
    const { username, password } = registerSchema.assert(await c.req.json());
    const user = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.username, username))
      .limit(1)
      .get();
    console.log({ fetchedUser: user });
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
    const [access_token, refresh_token, csrf_token] = await Promise.all([
      generateAccessToken(user.id, ACCESS_AUD),
      generateRefreshToken(user.id),
      generateCSRFToken(user.id)
    ]);
    //todo: what happen when you are only on http to start with.
    setCookie(c, "access_token", access_token, {
      httpOnly: true,
      secure: true
    });
    setCookie(c, "refresh_token", refresh_token.token, {
      httpOnly: true,
      secure: true,
      path: "/auth/refresh"
    });
    setCookie(c, "csrf_token", csrf_token, { httpOnly: false, secure: true });
    return c.json({
      message: "Login successful"
      // data: omit(user, ["password_hash"])
    });
  } catch (error) {
    return errorHandler(c, error);
  }
});

adminAuthRouter.post("/logout", async (c) => {
  try {
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

    return c.json({ message: "Logged out successfully" });
  } catch (error) {
    return errorHandler(c, error);
  }
});

adminAuthRouter.post("/refresh", async (c) => {
  try {
    const refreshToken = getCookie(c, "refresh_token");

    if (!refreshToken) {
      return c.json({ error: "Missing refresh token" }, 401);
    }

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch (err) {
      return c.json({ error: err.message }, 401);
    }

    const [newAccessToken, newRefreshToken] = await Promise.all([
      generateAccessToken(payload.sub, ACCESS_AUD),
      generateRefreshToken(payload.sub)
    ]);

    setCookie(c, "access_token", newAccessToken, {
      httpOnly: true,
      secure: true
    });

    setCookie(c, "refresh_token", newRefreshToken.token, {
      httpOnly: true,
      secure: true
    });

    return c.json({ message: "Token refreshed" });
  } catch (error) {
    return errorHandler(c, error);
  }
});

adminAuthRouter.get("/verify", async (c) => {
  try {
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
  } catch (error) {
    return errorHandler(c, error);
  }
});

const changePasswordSchema = type({
  current_password: type.string,
  new_password: type.string
});

adminAuthRouter.post("/change-password", async (c) => {
  try {
    const accessToken = getCookie(c, "access_token");
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { current_password, new_password } = changePasswordSchema.assert(
      await c.req.json()
    );

    const user = await db
      .select()
      .from(platformAdminsTable)
      .where(eq(platformAdminsTable.id, payload.sub))
      .limit(1)
      .get();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const valid = await verifyPasswordHash(
      user.password_hash,
      current_password
    );

    if (!valid) {
      return c.json({ error: "Invalid current password" }, 400);
    }

    const strong = await verifyPasswordStrength(new_password);
    if (!strong) {
      return c.json({ error: "Password is not strong enough" }, 400);
    }

    const newHash = await hashPassword(new_password);

    await db
      .update(platformAdminsTable)
      .set({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .where(eq(platformAdminsTable.id, user.id));

    // Optional: force logout everywhere
    setCookie(c, "access_token", "", { maxAge: 0 });
    setCookie(c, "refresh_token", "", { maxAge: 0 });

    return c.json({ message: "Password changed successfully" });
  } catch (error) {
    return errorHandler(c, error);
  }
});
