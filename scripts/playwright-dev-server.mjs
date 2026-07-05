import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = process.argv[2] || process.env.PORT || "3000";
const nextBin = resolve("node_modules/next/dist/bin/next");

console.log(`[playwright] Next.js dev server http://localhost:${port}`);

const child = spawn(process.execPath, [nextBin, "dev", "-p", port], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: port,
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
