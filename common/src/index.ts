import { signPayload } from "@zipup/common";
import { z } from "zod/v4";
import crypto from "node:crypto";
import { TIMEOUT } from "node:dns";
// export type DEPLOYMENT_STATUS = "IN_PROGRESS" | "SUCCESS" | "FAILED";
export const enum DEPLOYMENT_STATUS {
  IN_PROGRESS = "IN_PROGRESS",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT"
}
export const UsernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const AdminLoginSchema = z.object({
  username: UsernameSchema,
  password: PasswordSchema
});

export const AdminChangePasswordSchema = z.object({
  // current_password: passwordSchema,
  new_password: PasswordSchema
});

// todo: any restriction on redis keys names
export const RedisPrefixSchema = z
  .string()
  .min(2, "Redis prefix must be at least 2 characters long")
  .max(8, "Redis prefix must be at most 8 characters long");

const domainSchema = z
  .string()
  .trim()
  .min(1, "Domain is required")
  .transform((val) => val.replace(/^https?:\/\//, ""))
  .transform((val) => {
    try {
      const url = new URL(`http://${val}`);

      const hostname = url.hostname;
      let path = url.pathname || "/";

      // normalize path
      if (!path.startsWith("/")) {
        path = "/" + path;
      }

      // remove trailing slash (except root)
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }

      // 👇 do NOT include "/" for root in final string
      return hostname + (path === "/" ? "" : path);
    } catch {
      return val; // let refine handle invalid
    }
  })
  .refine((val) => {
    try {
      const url = new URL(`http://${val}`);

      const hostname = url.hostname;

      const isValidHost = hostname === "localhost" || hostname.includes(".");

      const isCleanPath = !url.search && !url.hash;

      return isValidHost && isCleanPath;
    } catch {
      return false;
    }
  }, "Invalid domain or domain/path");
export const DomainNameSchema = z.object({
  domain: domainSchema
});

export const AppNameSchema = z.string().min(3);
export const AppTypeSchema = z.enum(["STATIC", "DYNAMIC"]);
export const CreateAppSchema = z.object({
  name: AppNameSchema,
  type: AppTypeSchema
});

export const AppPatchActionSchema = z.enum([
  "UpdateDomain",
  "UpdateStartCommand",
  "UpdateAppName",
  "UpdateRedisPrefix"
]);
export type AppPatchActionSchema = z.infer<typeof AppPatchActionSchema>;

export const nonEmptyString = z
  .string("Must be a string")
  .trim()
  .min(1, "Value cannot be empty");
export const AppPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal(AppPatchActionSchema.enum.UpdateDomain),
    domain: domainSchema
  }),

  z.object({
    action: z.literal(AppPatchActionSchema.enum.UpdateStartCommand),
    start_command: nonEmptyString
  }),

  z.object({
    action: z.literal(AppPatchActionSchema.enum.UpdateAppName),
    name: nonEmptyString
  })

]);

const EnvkeySchema = z.string();
const EnvValueSchema = z.string();

export const CreateEnvVarSchema = z.object({
  key: EnvkeySchema,
  value: EnvValueSchema,
  description: z.string().optional()
});

export const UpdateEnvVarSchema = z.object({
  value: EnvValueSchema,
  description: z.string().optional()
});

export const CreatePeerSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional()
});

/** For Payload Signature and verification */

export function signPayload(
  method: string,
  path: string,
  bodyHash: string,
  secretKey: string
) {
  const expires = Math.floor(Date.now() / 1000) + 300; // expires in 5 minutes
  const canonical = [method.toUpperCase(), path, expires, bodyHash].join("\n");

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(canonical)
    .digest("hex");
  return signature;
}

export const createBodyHash = (data: string | Buffer) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

export const enum AppStatus {
  DRAFT = "DRAFT",
  READY = "READY",
  STOPPED = "STOPPED",
  RUNNING = "RUNNING"
}
