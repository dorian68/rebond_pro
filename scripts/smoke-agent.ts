import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { runAgent } from "../src/server/agent/runtime";
import { AGENT_TOOLS, getTool, isSensitive } from "../src/server/agent/tools";
import type { AGUIEvent } from "../src/lib/ag-ui/types";
import { signAgentApproval } from "../src/server/agent/approval-token";

runner("agent_smoke", async () => {
  // 1. Registre des outils : lecture + écriture présents, sensibilité correcte
  const names = AGENT_TOOLS.map((t) => t.name);
  assert(names.includes("create_formation") && names.includes("delete_session"), "Outils d'écriture absents du registre.");
  assert(isSensitive("create_formation") === true, "create_formation devrait être sensible.");
  assert(isSensitive("search_entities") === false, "search_entities ne devrait pas être sensible.");
  assert(getTool("search_entities"), "search_entities introuvable.");
  step("tool_registry", { total: names.length, writeToolsSensitive: true });

  const t = await createTestTenant("agent");
  try {
    // 2. search_entities renvoie des IDs (nécessaire pour agir) — crée une formation puis cherche
    await prisma.formation.create({ data: { organizationId: t.organizationId, title: "Cible Agent", slug: "cible-agent", price: 0, modality: "PRESENTIEL", level: "DEBUTANT", status: "PUBLIE" } });
    const searchRes = await getTool("search_entities")!.execute(t, { entityType: "formation", query: "Cible" });
    const parsed = JSON.parse(searchRes.textForLLM) as { items: { id: string; label: string }[] };
    assert(Array.isArray(parsed.items) && parsed.items[0]?.id, "search_entities ne renvoie pas d'IDs exploitables.");
    step("search_returns_ids", { count: parsed.items.length });

    // 3. Chemin human-in-the-loop : exécution APRÈS approbation via runAgent
    const events: AGUIEvent[] = [];
    const emit = (e: AGUIEvent) => events.push(e);
    const approvalId = crypto.randomUUID();
    const approvedArgs = { title: "Formation par Agent", priceEuros: 990, status: "BROUILLON" };
    const approvalToken = signAgentApproval({ approvalId, tool: "create_formation", args: approvedArgs, userId: t.userId, persona: "center", executionContext: "default" });
    await runAgent(
      t,
      {
        threadId: "smoke-thread",
        messages: [{ id: "m1", role: "user", content: "ok" }],
        forwardedProps: { approvedAction: { tool: "create_formation", args: approvedArgs, approvalId, approvalToken } },
      },
      emit,
    );

    const runFinished = events.find((e) => e.type === "RunFinished") as { outcome?: { type: string } } | undefined;
    assert(runFinished?.outcome?.type === "success", "Le run agent approuvé n'a pas abouti.");
    const created = await prisma.formation.findFirst({ where: { organizationId: t.organizationId, title: "Formation par Agent" } });
    assert(created, "L'agent n'a pas créé la formation après approbation.");
    assert(created.price === 99000, "Prix de la formation agent incorrect.");
    step("agent_approved_execution", { id: created.id, price: created.price });

    // 4. Vérité des statuts : une erreur outil ne doit jamais être annoncée comme un succès.
    const failedEvents: AGUIEvent[] = [];
    const failedApprovalId = crypto.randomUUID();
    const invalidArgs = { title: "" };
    const failedApprovalToken = signAgentApproval({ approvalId: failedApprovalId, tool: "create_formation", args: invalidArgs, userId: t.userId, persona: "center", executionContext: "default" });
    await runAgent(
      t,
      {
        threadId: "smoke-thread-failure",
        messages: [{ id: "m2", role: "user", content: "ok" }],
        forwardedProps: { approvedAction: { tool: "create_formation", args: invalidArgs, approvalId: failedApprovalId, approvalToken: failedApprovalToken } },
      },
      (event) => failedEvents.push(event),
    );
    const failedRun = failedEvents.find((event) => event.type === "RunFinished") as { outcome?: { type: string } } | undefined;
    assert(failedRun?.outcome?.type === "failure", "Une erreur d'outil doit terminer le run en échec.");
    assert(failedEvents.some((event) => event.type === "RunError"), "Une erreur d'outil doit émettre RunError.");
    assert(!failedEvents.some((event) => event.type === "TextMessageContent" && event.delta.includes("C'est fait")), "Une erreur d'outil ne doit jamais afficher « C'est fait ».");
    step("agent_failure_is_truthful", { runOutcome: failedRun?.outcome?.type, falseSuccess: false });

    // 5. Traçabilité : interaction IA loggée
    const log = await prisma.aiInteraction.findFirst({ where: { organizationId: t.organizationId, type: "agui_action" } });
    assert(log, "L'action agent n'a pas été tracée dans AiInteraction.");
    step("agent_action_logged", { logged: true });
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
