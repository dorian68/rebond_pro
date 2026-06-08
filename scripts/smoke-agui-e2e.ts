import "./_env";
import { prisma } from "../src/lib/prisma";
import { step, assert, runner } from "./_tenant";
import { randomUUID } from "node:crypto";

// AG-UI END-TO-END contre la vraie route /api/ag-ui/run (DEV_AUTOLOGIN actif).
// Précondition : serveur lancé + clé LLM configurée (OpenAI/Anthropic).
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

type AnyEvent = Record<string, unknown>;

async function runAgent(body: unknown): Promise<AnyEvent[]> {
  const res = await fetch(`${BASE}/api/ag-ui/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert(res.ok, `/api/ag-ui/run statut ${res.status}`);
  const text = await res.text();
  const events: AnyEvent[] = [];
  for (const line of text.split("\n")) {
    const l = line.trim();
    if (!l.startsWith("data:")) continue;
    const payload = l.slice(5).trim();
    if (payload === "[DONE]") continue;
    try { events.push(JSON.parse(payload)); } catch { /* ignore */ }
  }
  return events;
}

runner("agui_e2e_smoke", async () => {
  const title = `E2E AUTO ${Date.now()}`;

  // 1. L'agent (vrai LLM) doit APPELER l'outil create_formation (AGUI-08)
  const evts = await runAgent({
    threadId: randomUUID(),
    messages: [{ id: randomUUID(), role: "user", content: `Appelle immédiatement l'outil create_formation pour créer une formation intitulée exactement "${title}", 1 jour, présentiel, statut BROUILLON. N'hésite pas, exécute l'outil maintenant.` }],
    state: { pathname: "/formations", title: "Formations" },
  });
  const toolCalls = evts.filter((e) => e.type === "ToolCallStart").map((e) => e.toolCallName);
  const approvals = evts.filter((e) => e.type === "Custom" && e.name === "app.approval.required");
  assert(toolCalls.includes("create_formation"), `L'agent n'a pas appelé create_formation. Outils appelés: ${toolCalls.join(",") || "aucun"}`);
  assert(approvals.length > 0, "Aucune carte de validation émise pour l'action sensible.");
  step("AGUI-08_agent_proposes_create", { toolCalls });

  // 2. Exécution réelle après approbation (via la route) → formation créée
  const okEvts = await runAgent({
    threadId: randomUUID(),
    messages: [{ id: randomUUID(), role: "user", content: "ok" }],
    forwardedProps: { approvedAction: { tool: "create_formation", args: { title, status: "BROUILLON", modality: "PRESENTIEL", durationDays: 1 }, approvalId: randomUUID() } },
  });
  const finished = okEvts.find((e) => e.type === "RunFinished") as { outcome?: { type: string } } | undefined;
  assert(finished?.outcome?.type === "success", "Le run approuvé (création) n'a pas abouti.");
  const created = await prisma.formation.findFirst({ where: { title }, orderBy: { createdAt: "desc" } });
  assert(created, "La formation n'a pas été créée en base via la route AG-UI.");
  step("AGUI-08_create_executed", { id: created.id });

  // 3. Suppression via l'agent (AGUI-09) après approbation → soft delete
  const delEvts = await runAgent({
    threadId: randomUUID(),
    messages: [{ id: randomUUID(), role: "user", content: "ok" }],
    forwardedProps: { approvedAction: { tool: "delete_formation", args: { id: created.id }, approvalId: randomUUID() } },
  });
  const delFinished = delEvts.find((e) => e.type === "RunFinished") as { outcome?: { type: string } } | undefined;
  assert(delFinished?.outcome?.type === "success", "Le run approuvé (suppression) n'a pas abouti.");
  const deleted = await prisma.formation.findUnique({ where: { id: created.id } });
  assert(deleted?.deletedAt, "La formation n'a pas été supprimée via la route AG-UI.");
  step("AGUI-09_delete_executed");

  // Nettoyage dur
  await prisma.formation.delete({ where: { id: created.id } }).catch(() => {});
  step("cleanup");
});
