import {
  REMEMBER_SESSION_MAX_AGE_SECONDS,
  SHORT_SESSION_MAX_AGE_SECONDS,
  isSessionExpired,
  sessionExpiresAt,
  sessionMaxAgeSeconds,
} from "../src/lib/auth-session-policy";

function log(check: string, status: "pass" | "fail", detail?: Record<string, unknown>) {
  console.log(JSON.stringify({ check, status, ...detail }));
}

function assert(check: string, condition: boolean, detail?: Record<string, unknown>) {
  if (!condition) {
    log(check, "fail", detail);
    process.exitCode = 1;
    return;
  }
  log(check, "pass", detail);
}

const now = 1_800_000_000;

assert("short session max age", sessionMaxAgeSeconds(false) === SHORT_SESSION_MAX_AGE_SECONDS, {
  seconds: sessionMaxAgeSeconds(false),
});
assert("remember session max age", sessionMaxAgeSeconds(true) === REMEMBER_SESSION_MAX_AGE_SECONDS, {
  seconds: sessionMaxAgeSeconds(true),
});
assert("short session expiry", sessionExpiresAt(false, now) === now + SHORT_SESSION_MAX_AGE_SECONDS, {
  expiresAt: sessionExpiresAt(false, now),
});
assert("remember session expiry", sessionExpiresAt(true, now) === now + REMEMBER_SESSION_MAX_AGE_SECONDS, {
  expiresAt: sessionExpiresAt(true, now),
});
assert("server rejects expired token", isSessionExpired(now - 1, now) === true);
assert("server accepts active token", isSessionExpired(now + 1, now) === false);

if (process.exitCode) {
  log("auth session policy", "fail");
  process.exit(process.exitCode);
}
log("auth session policy", "pass");
