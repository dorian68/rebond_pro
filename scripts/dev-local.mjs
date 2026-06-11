import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

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
if (!databaseUrl) throw new Error("DATABASE_URL local absent de .env.");

const url = new URL(databaseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
  throw new Error("npm run dev:local exige une DATABASE_URL locale dans .env.");
}

const port = process.env.PORT ?? "3100";
console.log(`[dev:local] PostgreSQL local ${url.hostname}:${url.port || "5432"} - Next.js http://localhost:${port}`);

const child = spawn(
  process.execPath,
  [resolve("node_modules/next/dist/bin/next"), "dev", "--webpack", "-p", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      // L'email configuré pour Supabase n'existe pas forcément dans la base locale.
      // Une valeur vide laisse devAutoSession sélectionner le premier OWNER local.
      DEV_AUTOLOGIN_EMAIL: "",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
