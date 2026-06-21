export const SHORT_SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const REMEMBER_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function sessionMaxAgeSeconds(rememberSession: boolean) {
  return rememberSession ? REMEMBER_SESSION_MAX_AGE_SECONDS : SHORT_SESSION_MAX_AGE_SECONDS;
}

export function sessionExpiresAt(rememberSession: boolean, nowSeconds = Math.floor(Date.now() / 1000)) {
  return nowSeconds + sessionMaxAgeSeconds(rememberSession);
}

export function isSessionExpired(expiresAt: unknown, nowSeconds = Math.floor(Date.now() / 1000)) {
  return typeof expiresAt === "number" && nowSeconds >= expiresAt;
}
