import path from "path";

export const PORT_FOR_USER_APPS = 3000;
export const ISSUER = "zipup_server";
export enum AUD {
  ZIPUP_API = "zipup_api",
}
export enum CookieType {
  ACCESS_TOKEN = "access_token",
  REFRESH_TOKEN = "refresh_token",
  CSRF_TOKEN = "csrf_token"
}

export enum TokenPurpose {
  ACCESS = "access",
  REFRESH = "refresh",
  CSRF = "csrf"
}

export const STATIC_ARTIFACT_ROOT = "/static_artifacts";
export const STATIC_TEMP_DIR = path.join(STATIC_ARTIFACT_ROOT, "temp");
export const DYNAMIC_ARTIFACT_ROOT = "/dynamic_artifacts";
export const DYNAMIC_TEMP_DIR = path.join(DYNAMIC_ARTIFACT_ROOT, "temp");