export const PORT_FOR_USER_APPS = 3000;
export const ISSUER = "paasup_server";
export enum AUD {
  paasup_API = "paasup_api",
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
