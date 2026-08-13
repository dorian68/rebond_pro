import "./_env";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { projectRoadmap2OverviewNodes } from "../src/app/admin/roadmap-2/roadmap2-ui";
import type { Roadmap2NodeDto } from "../src/lib/roadmap2";
import { signAgentApproval, verifyAgentApproval } from "../src/server/agent/approval-token";
import { roadmap2EmailRequestHash, roadmap2EmailTrackingReference, roadmap2FinalEmailBody } from "../src/server/connectors";
import { isToolAllowed } from "../src/lib/ag-ui/persona";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "roadmap2-agentic-gmail-smoke-secret";

function node(id: string, parentId: string | null = null): Roadmap2NodeDto {
  return {
    id, title: id, description: null, expectedOutcome: null, type: "action", category: "technology_data", status: "not_started", priority: "P1", progressPercent: 0,
    ownerUserId: null, owner: null, startDate: null, dueDate: null, nextAction: null, decisionRequired: false, definitionOfDone: null, driveFolderUrl: null,
    trackingDocUrl: null, parentId, positionX: 0, positionY: 0, width: null, isWorkspaceRoot: false, archivedAt: null, version: 1,
    createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(), updatedBy: null, updates: [],
  };
}

async function main() {
  const twoFreeNodes = [node("a"), node("b")];
  assert.deepEqual(projectRoadmap2OverviewNodes(twoFreeNodes, new Set()).map((item) => item.id), ["a", "b"], "Deux nœuds libres doivent rester visibles dans le graphe.");
  assert.deepEqual(projectRoadmap2OverviewNodes(twoFreeNodes, new Set(), true), twoFreeNodes, "Afficher tout doit rendre tous les nœuds.");

  const approval = { approvalId: crypto.randomUUID(), tool: "send_external_gmail", args: { to: ["client@example.test"], subject: "Point projet", body: "Bonjour" }, userId: "admin-1", persona: "platform_admin" as const, executionContext: "roadmap2_admin" as const };
  const token = signAgentApproval(approval);
  assert.equal(verifyAgentApproval(token, approval), true, "Une approbation intacte doit être acceptée.");
  assert.equal(verifyAgentApproval(token, { ...approval, args: { ...approval.args, subject: "Objet modifié" } }), false, "Des arguments modifiés doivent invalider l'approbation.");
  assert.equal(verifyAgentApproval(token, { ...approval, userId: "admin-2" }), false, "L'approbation ne doit pas être transférable à un autre utilisateur.");
  assert.equal(verifyAgentApproval(token, { ...approval, executionContext: "default" }), false, "L'approbation Roadmap 2 ne doit pas être rejouable hors de son endpoint dédié.");
  assert.equal(isToolAllowed("platform_admin", "send_external_gmail", "default"), false, "Gmail doit être interdit sur l'endpoint agent générique.");
  assert.equal(isToolAllowed("platform_admin", "send_external_gmail", "roadmap2_admin"), true, "Gmail doit être autorisé sur l'endpoint Roadmap 2 dédié.");
  assert.match(roadmap2EmailTrackingReference("a".repeat(64)), /^RM2-[A-F0-9]{24}$/, "La référence Gmail doit être déterministe et non sensible.");
  const finalRequestHash = roadmap2EmailRequestHash({ to: ["client@example.test"], subject: "Point projet", body: "  Corps approuvé  " });
  assert.equal(
    roadmap2FinalEmailBody({ body: "  Corps approuvé  ", requestHash: finalRequestHash }),
    `Corps approuvé\n\n—\nRéférence de suivi Roadmap 2 : ${roadmap2EmailTrackingReference(finalRequestHash)}`,
    "Le corps affiché avant approbation et le corps envoyé doivent partager une seule construction normalisée.",
  );

  const [connectors, tools, persona, schema, migration, renderer, route, conversationStore, runtime, connectorActions, adminCallback] = await Promise.all([
    readFile("src/server/connectors.ts", "utf8"), readFile("src/server/agent/roadmap2-tools.ts", "utf8"), readFile("src/lib/ag-ui/persona.ts", "utf8"),
    readFile("prisma/schema.prisma", "utf8"), readFile("prisma/migrations/20260813150000_roadmap2_agentic_gmail/migration.sql", "utf8"),
    readFile("src/components/agent/AgentUIBlockRenderer.tsx", "utf8"), readFile("src/app/api/ag-ui/run/route.ts", "utf8"),
    readFile("src/lib/ag-ui/conversation-store.ts", "utf8"), readFile("src/server/agent/runtime.ts", "utf8"),
    readFile("src/server/connectors-actions.ts", "utf8"), readFile("src/app/admin/integrations/composio/callback/page.tsx", "utf8"),
  ]);
  assert.match(connectors, /connectedAccountId/, "Les appels Gmail doivent être épinglés au compte actif.");
  assert.match(connectors, /recipientHashes/);
  assert.match(connectors, /slice\(0, 20_000\)/, "La lecture détaillée doit fournir un corps nettoyé au-delà du simple extrait de liste.");
  assert.match(connectors, /attachments\.slice\(0, 30\)/, "La lecture détaillée doit exposer les métadonnées de pièces jointes.");
  assert.doesNotMatch(connectors, /payload:\s*\{[\s\S]*?subject[,}]/, "Le journal idempotent ne doit pas conserver l'objet en clair.");
  assert.match(tools, /send_external_gmail/);
  assert.match(tools, /Un champ structurel non autorisé/);
  assert.match(persona, /send_external_gmail/);
  assert.match(schema, /model Roadmap2EmailOperation/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /AgentApprovalUse_approvalId_key/);
  assert.match(renderer, /Confirmer|confirmation_card/);
  assert.match(runtime, /label: "Cci"/);
  assert.doesNotMatch(runtime, /roadmap2FinalEmailBody\([^)]*\)\.slice/, "L’aperçu Gmail approuvé ne doit jamais être tronqué.");
  assert.match(runtime, /Object\.entries\(args\.changes/);
  assert.match(route, /platformAdmin && session\?\.user\?\.id/);
  assert.match(route, /\/api\/ag-ui\/roadmap-2\/run/, "Le contexte Roadmap 2 doit être déterminé par l'endpoint serveur.");
  assert.match(conversationStore, /block\.type !== "confirmation_card" && block\.type !== "email_list"/, "Les emails et jetons d'approbation ne doivent pas persister dans localStorage.");
  assert.match(runtime, /APPROVAL_REPLAYED/, "Une approbation déjà consommée doit être rejetée.");
  assert.match(runtime, /read_external_gmail_email" \? 12_000 : 4_000/, "L'analyse détaillée doit recevoir davantage que l'extrait de liste.");
  assert.match(connectorActions, /platformAdmin && session\?\.user\?\.id && scope === "personal"/, "Le super-admin sans centre doit pouvoir lancer l'OAuth personnel.");
  assert.match(adminCallback, /requirePlatformAdmin/, "Le retour OAuth admin doit être protégé.");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({ data: { email: `roadmap2-agentic-${stamp}@smoke.test`, platformAdmin: true } });
  const workspace = await prisma.roadmap2Workspace.create({ data: { key: `agentic-${stamp}`, name: "Smoke agentique Gmail" } });
  try {
    const rls = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
      SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('AgentApprovalUse', 'Roadmap2EmailOperation')
    `;
    assert.equal(rls.length, 2);
    assert(rls.every((row) => row.relrowsecurity), "RLS doit être activé sur les deux nouveaux journaux.");

    const approvalId = crypto.randomUUID();
    await prisma.agentApprovalUse.create({ data: { approvalId, actorUserId: user.id, tool: "send_external_gmail", argsHash: "a".repeat(64) } });
    await assert.rejects(
      prisma.agentApprovalUse.create({ data: { approvalId, actorUserId: user.id, tool: "send_external_gmail", argsHash: "a".repeat(64) } }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
      "Une approbation ne doit pas être consommable deux fois.",
    );

    const idempotencyKey = crypto.randomUUID();
    await prisma.roadmap2EmailOperation.create({ data: { workspaceId: workspace.id, actorUserId: user.id, idempotencyKey, requestHash: "b".repeat(64), payload: { recipientHashes: [], subjectHash: "c".repeat(64), bodyHash: "d".repeat(64) } } });
    await assert.rejects(
      prisma.roadmap2EmailOperation.create({ data: { workspaceId: workspace.id, actorUserId: user.id, idempotencyKey, requestHash: "b".repeat(64), payload: {} } }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
      "La même validation d'envoi ne doit pas créer deux opérations.",
    );
    await assert.rejects(
      prisma.roadmap2EmailOperation.create({ data: { workspaceId: workspace.id, actorUserId: user.id, idempotencyKey: crypto.randomUUID(), requestHash: "b".repeat(64), payload: {} } }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
      "Deux validations distinctes du même email ne doivent pas créer deux opérations.",
    );
    await prisma.roadmap2EmailOperation.update({ where: { workspaceId_idempotencyKey: { workspaceId: workspace.id, idempotencyKey } }, data: { status: "succeeded", completedAt: new Date() } });
    await assert.rejects(
      prisma.roadmap2EmailOperation.create({ data: { workspaceId: workspace.id, actorUserId: user.id, idempotencyKey: crypto.randomUUID(), requestHash: "b".repeat(64), status: "succeeded", completedAt: new Date(), payload: {} } }),
      (error: unknown) => Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002"),
      "Un email déjà confirmé ne doit pas pouvoir être renvoyé à l'identique avec une autre validation.",
    );
  } finally {
    await prisma.roadmap2Workspace.delete({ where: { id: workspace.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  }
  console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_agentic_gmail", freeNodesVisible: 2, approvalTamperRejected: true, durableSendLedger: true, databaseGuards: true }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
