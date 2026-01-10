export const PORT_FOR_USER_APPS = 3000;
export const ISSUER = "zipup_server";
export enum AUD {
  zipup_API = "zipup_api",
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
