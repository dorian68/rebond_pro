import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

function readEnvValue(file, key) {
  const text = readFileSync(resolve(process.cwd(), file), "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1 || line.slice(0, eq).trim() !== key) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return null;
}

const databaseUrl = readEnvValue(".env", "DATABASE_URL");
if (!databaseUrl) throw new Error("DATABASE_URL locale absente de .env.");

const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  throw new Error("npm run smoke:all:local exige une DATABASE_URL locale dans .env.");
}

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) throw new Error("npm_execpath absent. Lancez cette suite avec npm run smoke:all:local.");

console.log(`[smoke:all:local] PostgreSQL ${url.hostname}:${url.port || "5432"}; services externes neutralisés.`);
const result = spawnSync(process.execPath, [npmExecPath, "run", "smoke:all"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    CENTER_PLAN_LIMITS_DISABLED: "false",
    RESEND_API_KEY: "",
    EMAIL_SMTP_HOST: "localhost",
    EMAIL_SMTP_PORT: "1025",
    EMAIL_SMTP_USER: "",
    EMAIL_SMTP_PASSWORD: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    COMPOSIO_API_KEY: "",
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_DIR: "./tmp/smoke-storage",
    SUPABASE_URL: "",
    SUPABASE_SERVICE_KEY: "",
    DEV_AUTOLOGIN: "false",
    APP_PUBLIC_URL: "http://localhost:3100",
  },
});

process.exit(result.status ?? 1);
