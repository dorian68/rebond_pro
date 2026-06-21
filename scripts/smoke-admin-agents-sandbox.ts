import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function step(label: string, details?: unknown) {
  console.log(JSON.stringify({ step: label, status: "pass", ...(details ? { details } : {}) }));
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

try {
  const sandboxPath = "src/server/agentic/admin-sandbox.ts";
  const pagePath = "src/app/admin/agents/page.tsx";
  const navPath = "src/app/admin/admin-nav.tsx";
  const apiPath = "src/app/api/admin-agents";

  assert(existsSync(join(process.cwd(), sandboxPath)), "Le module agentique sandbox doit exister.");
  assert(existsSync(join(process.cwd(), pagePath)), "La page /admin/agents doit exister.");
  step("files_exist");

  const sandbox = read(sandboxPath);
  const page = read(pagePath);
  const nav = read(navPath);

  assert(sandbox.includes("requirePlatformAdmin"), "Les agents sandbox doivent exiger requirePlatformAdmin côté serveur.");
  assert(page.includes("runAdminSandboxAgents"), "La page admin doit appeler le runner sandbox protégé.");
  assert(nav.includes("/admin/agents"), "La navigation admin doit exposer uniquement la page admin agents.");
  step("admin_only_entrypoint");

  const forbiddenWrites = [
    ".create(",
    ".update(",
    ".updateMany(",
    ".delete(",
    ".deleteMany(",
    ".upsert(",
    "sendEmail",
    "sendLeadNotificationEmail",
    "sendSkillAssessmentEmail",
    "generateDocuments",
    "WRITE_TOOLS",
    "AGENT_TOOLS",
  ];
  for (const forbidden of forbiddenWrites) {
    assert(!sandbox.includes(forbidden), `Le sandbox ne doit pas contenir d'action mutable ou outil AG-UI sensible : ${forbidden}`);
  }
  step("read_only_contract");

  assert(sandbox.includes("SANDBOX_READ_ONLY"), "Les rapports doivent déclarer explicitement le mode SANDBOX_READ_ONLY.");
  assert(sandbox.includes("Aucune écriture Prisma"), "Les garde-fous doivent annoncer l'absence d'écriture Prisma.");
  assert(!existsSync(join(process.cwd(), apiPath)), "Aucune API publique dédiée ne doit exposer ces agents.");
  step("sandbox_guardrails");

  const expectedAgents = [
    "center_audit",
    "documents_qualiopi",
    "planning_optimizer",
    "marketplace_readiness",
    "pedagogical_designer",
    "crm_next_actions",
    "onboarding_center",
    "finance_network",
  ];
  for (const agentId of expectedAgents) {
    assert(sandbox.includes(`id: "${agentId}"`), `Agent sandbox manquant : ${agentId}`);
  }
  step("expected_agents_registered", { count: expectedAgents.length });

  step("admin_agents_sandbox_smoke_complete");
} catch (e) {
  console.error(JSON.stringify({ step: "admin_agents_sandbox_smoke", status: "fail", error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
}
