import { spawnSync } from "node:child_process";

export const HEADLESS_SMOKE_SUITES = [
  "smoke:health",
  "smoke:lot5",
  "smoke:auth",
  "smoke:admin-auth",
  "smoke:auth-session",
  "smoke:google-oauth",
  "smoke:registration",
  "smoke:crud",
  "smoke:agent",
  "smoke:marketplace",
  "smoke:tenant",
  "smoke:password-reset",
  "smoke:dedup",
  "smoke:billing",
  "smoke:quota",
  "smoke:trainer-portal",
  "smoke:planning-stress",
  "smoke:formation-modules-planning",
  "smoke:documents-engine",
  "smoke:document-intake",
  "smoke:admin-agents",
  "smoke:roadmap",
  "smoke:roadmap-2",
  "smoke:roadmap-2:a11y",
  "smoke:connectors",
  "smoke:beneficiary",
  "smoke:platform-beneficiaries",
  "smoke:platform",
  "smoke:persona",
  "smoke:finance",
  "smoke:public-purchase",
  "smoke:public-forms",
  "smoke:commercial-trust",
  "smoke:business",
  "smoke:business-marketplace",
  "smoke:business-google-oauth",
];

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) throw new Error("npm_execpath absent. Lancez cette suite avec npm run smoke:all.");

for (const suite of HEADLESS_SMOKE_SUITES) {
  console.log(JSON.stringify({ suite, status: "start" }));
  const result = spawnSync(process.execPath, [npmExecPath, "run", suite], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(JSON.stringify({ suite, status: "fail", exitCode: result.status ?? 1 }));
    process.exit(result.status ?? 1);
  }
  console.log(JSON.stringify({ suite, status: "pass" }));
}

console.log(JSON.stringify({ status: "pass", suites: HEADLESS_SMOKE_SUITES.length }));
