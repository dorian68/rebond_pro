import "./_env";
import { readFileSync } from "node:fs";
import { DOCUMENT_INTAKE_ROUTES, DOCUMENT_INTAKE_TARGETS } from "../src/lib/document-intake";
import { documentIntakeRequestSchema } from "../src/server/document-intake";

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

for (const target of DOCUMENT_INTAKE_TARGETS) {
  assert(`route ${target}`, DOCUMENT_INTAKE_ROUTES[target].startsWith("/"), { route: DOCUMENT_INTAKE_ROUTES[target] });
  const parsed = documentIntakeRequestSchema.safeParse({
    target,
    filename: `${target}.pdf`,
    extractedText: "Document de test extrait par fonction avant IA.",
    context: {},
  });
  assert(`schema ${target}`, parsed.success, parsed.success ? undefined : { error: parsed.error.issues[0]?.message });
}

const oversized = documentIntakeRequestSchema.safeParse({
  target: "formation",
  attachments: [{ name: "big.pdf", type: "application/pdf", data: "x", size: 6_000_000 }],
});
assert("reject oversized attachment", !oversized.success);

const intakeSource = readFileSync("src/server/document-intake.ts", "utf8");
const uiSource = readFileSync("src/components/app/DocumentImportPrefill.tsx", "utf8");
const bulkSource = readFileSync("src/components/app/BulkEntityCreate.tsx", "utf8");
assert("multi item prompt", intakeSource.includes('"items":[]'), { contract: "items[]" });
assert("multi item normalization", intakeSource.includes("items.length > 1 ? items : undefined"));
assert("multi item ui", uiSource.includes("onApplyMany") && uiSource.includes("fiches détectées"));
assert("bulk create ui", bulkSource.includes("itemsJson") && bulkSource.includes("Ajouter plusieurs"));

if (process.exitCode) process.exit(process.exitCode);
log("document intake contract", "pass");
