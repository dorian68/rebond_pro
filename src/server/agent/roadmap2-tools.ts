import "server-only";

import type { AgentTool } from "@/server/agent/tools";
import type { UIBlock } from "@/lib/ag-ui/types";
import {
  ROADMAP2_CATEGORIES,
  ROADMAP2_NODE_TYPES,
  ROADMAP2_PRIORITIES,
  ROADMAP2_STATUSES,
  ROADMAP2_UPDATE_TYPES,
  ROADMAP2_STATUS_LABELS,
  ROADMAP2_PRIORITY_LABELS,
} from "@/lib/roadmap2";
import { getRoadmap2Data, resolveRoadmap2Context, roadmap2Repository } from "@/server/roadmap2";
import { listExternalGmailEmails, readExternalGmailEmail, sendExternalGmail } from "@/server/connectors";

function workspaceKey(args: Record<string, unknown>) {
  const value = String(args.workspaceKey ?? "").trim();
  return value || undefined;
}

function nodeCard(node: Awaited<ReturnType<typeof getRoadmap2Data>>["nodes"][number]): UIBlock {
  return {
    type: "entity_card",
    entityType: "roadmap2_node",
    title: node.title,
    subtitle: `${ROADMAP2_STATUS_LABELS[node.status]} · ${ROADMAP2_PRIORITY_LABELS[node.priority]}`,
    href: "/admin/roadmap-2",
    fields: [
      { label: "Progression", value: `${node.progressPercent} %` },
      { label: "Responsable", value: node.owner?.name ?? "Non assigné" },
      { label: "Prochaine action", value: node.nextAction ?? "—" },
    ],
  };
}

export const ROADMAP2_AGENT_TOOLS: AgentTool[] = [
  {
    name: "list_roadmap2_nodes",
    description: "Liste les nœuds actifs de Roadmap 2 avec leurs identifiants, versions, statuts, priorités, responsables et prochaines actions. À utiliser avant toute modification ciblée.",
    input_schema: { type: "object", properties: { workspaceKey: { type: "string" }, query: { type: "string" }, limit: { type: "number" } } },
    execute: async (_ctx, args) => {
      const data = await getRoadmap2Data(workspaceKey(args));
      const query = String(args.query ?? "").trim().toLocaleLowerCase("fr");
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
      const nodes = data.nodes.filter((node) => !node.archivedAt && node.status !== "archived" && (!query || `${node.title} ${node.description ?? ""} ${node.nextAction ?? ""}`.toLocaleLowerCase("fr").includes(query))).slice(0, limit);
      return {
        textForLLM: JSON.stringify({ workspace: data.workspace, nodes: nodes.map((node) => ({ id: node.id, version: node.version, title: node.title, type: node.type, category: node.category, status: node.status, priority: node.priority, progressPercent: node.progressPercent, ownerUserId: node.ownerUserId, owner: node.owner?.name, dueDate: node.dueDate, nextAction: node.nextAction, decisionRequired: node.decisionRequired, parentId: node.parentId, hasDriveFolder: Boolean(node.driveFolderUrl) })) }),
        uiBlock: { type: "data_table", title: "Roadmap 2", columns: ["Nœud", "Statut", "Priorité", "Avancement"], rows: nodes.slice(0, 12).map((node) => [node.title, ROADMAP2_STATUS_LABELS[node.status], node.priority, `${node.progressPercent} %`]), emptyText: "Aucun nœud actif." },
      };
    },
  },
  {
    name: "read_roadmap2_node",
    description: "Lit le détail d'un nœud Roadmap 2 par son identifiant. Toujours lire le nœud avant de proposer une modification.",
    input_schema: { type: "object", properties: { workspaceKey: { type: "string" }, nodeId: { type: "string" } }, required: ["nodeId"] },
    execute: async (_ctx, args) => {
      const data = await getRoadmap2Data(workspaceKey(args));
      const node = data.nodes.find((candidate) => candidate.id === String(args.nodeId));
      if (!node) throw new Error("Nœud Roadmap 2 introuvable.");
      return { textForLLM: JSON.stringify(node).slice(0, 8000), uiBlock: nodeCard(node) };
    },
  },
  {
    name: "create_roadmap2_node",
    description: "Crée un nœud dans Roadmap 2 après validation humaine. Peut transformer une décision ou action extraite d'un email en nœud. Ne crée pas automatiquement ses ressources Drive.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        workspaceKey: { type: "string" }, title: { type: "string" }, description: { type: "string" }, expectedOutcome: { type: "string" },
        type: { type: "string", enum: ROADMAP2_NODE_TYPES }, category: { type: "string", enum: ROADMAP2_CATEGORIES }, status: { type: "string", enum: ROADMAP2_STATUSES.filter((value) => value !== "archived") },
        priority: { type: "string", enum: ROADMAP2_PRIORITIES }, progressPercent: { type: "number" }, ownerUserId: { type: "string" }, startDate: { type: ["string", "null"] }, dueDate: { type: "string" },
        nextAction: { type: ["string", "null"] }, decisionRequired: { type: "boolean" }, definitionOfDone: { type: ["string", "null"] }, parentId: { type: ["string", "null"] },
      },
      required: ["title", "type", "category", "ownerUserId", "dueDate"],
    },
    execute: async (ctx, args) => {
      const { workspaceId } = await resolveRoadmap2Context(workspaceKey(args));
      const created = await roadmap2Repository.createNode(workspaceId, ctx.userId, {
        title: String(args.title ?? ""), description: args.description ? String(args.description) : null, expectedOutcome: args.expectedOutcome ? String(args.expectedOutcome) : null,
        type: args.type ?? "action", category: args.category, status: args.status ?? "not_started", priority: args.priority ?? "P1", progressPercent: Number(args.progressPercent ?? 0),
        ownerUserId: args.ownerUserId === null ? null : String(args.ownerUserId ?? ctx.userId), startDate: args.startDate ? String(args.startDate) : null, dueDate: args.dueDate ? String(args.dueDate) : null,
        nextAction: args.nextAction ? String(args.nextAction) : null, decisionRequired: Boolean(args.decisionRequired), definitionOfDone: args.definitionOfDone ? String(args.definitionOfDone) : null,
        driveFolderUrl: null, trackingDocUrl: null, parentId: args.parentId ? String(args.parentId) : null, positionX: 0, positionY: 0, width: null,
      });
      return { textForLLM: JSON.stringify({ created: true, id: created.id, version: created.version }), custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "update_roadmap2_node",
    description: "Modifie les champs non structurels d'un nœud Roadmap 2 après validation. Le titre, la catégorie et le parent ne sont volontairement pas modifiables ici afin de préserver la cohérence avec Google Drive.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        workspaceKey: { type: "string" }, nodeId: { type: "string" }, nodeTitle: { type: "string" }, expectedVersion: { type: "number" },
        changes: { type: "object", properties: { description: { type: ["string", "null"] }, expectedOutcome: { type: ["string", "null"] }, status: { type: "string", enum: ROADMAP2_STATUSES.filter((value) => value !== "archived") }, priority: { type: "string", enum: ROADMAP2_PRIORITIES }, progressPercent: { type: "number" }, ownerUserId: { type: ["string", "null"] }, startDate: { type: ["string", "null"] }, dueDate: { type: ["string", "null"] }, nextAction: { type: ["string", "null"] }, decisionRequired: { type: "boolean" }, definitionOfDone: { type: ["string", "null"] } } },
      },
      required: ["nodeId", "expectedVersion", "changes"],
    },
    execute: async (ctx, args) => {
      const data = await getRoadmap2Data(workspaceKey(args));
      const node = data.nodes.find((candidate) => candidate.id === String(args.nodeId));
      if (!node) throw new Error("Nœud Roadmap 2 introuvable.");
      if (node.version !== Number(args.expectedVersion)) throw new Error("Le nœud a changé. Relisez-le avant de proposer une nouvelle modification.");
      const changes = args.changes && typeof args.changes === "object" ? args.changes as Record<string, unknown> : {};
      const allowed = new Set(["description", "expectedOutcome", "status", "priority", "progressPercent", "ownerUserId", "startDate", "dueDate", "nextAction", "decisionRequired", "definitionOfDone"]);
      if (Object.keys(changes).some((key) => !allowed.has(key))) throw new Error("Un champ structurel non autorisé a été demandé.");
      const { workspaceId } = await resolveRoadmap2Context(workspaceKey(args));
      const updated = await roadmap2Repository.updateNode(workspaceId, ctx.userId, node.id, node.version, { ...node, ...changes });
      return { textForLLM: JSON.stringify({ updated: true, id: updated.id, version: updated.version }), custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "add_roadmap2_update",
    description: "Ajoute une note, décision, progression, validation ou un blocage à un nœud Roadmap 2 après validation humaine.",
    sensitive: true,
    input_schema: { type: "object", properties: { workspaceKey: { type: "string" }, nodeId: { type: "string" }, nodeTitle: { type: "string" }, nodeVersion: { type: "number" }, updateType: { type: "string", enum: ROADMAP2_UPDATE_TYPES }, body: { type: "string" } }, required: ["nodeId", "nodeVersion", "updateType", "body"] },
    execute: async (ctx, args) => {
      const { workspaceId } = await resolveRoadmap2Context(workspaceKey(args));
      const update = await roadmap2Repository.addUpdate(workspaceId, ctx.userId, args);
      return { textForLLM: JSON.stringify({ created: true, id: update.id, version: update.version }), custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "list_external_gmail_emails",
    description: "Liste jusqu'à 10 emails Gmail personnels récents. Accepte une requête de recherche Gmail, par exemple 'newer_than:14d projet'. Lecture seule.",
    input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } } },
    execute: async (ctx, args) => {
      const result = await listExternalGmailEmails(ctx, { query: args.query ? String(args.query) : undefined, limit: typeof args.limit === "number" ? args.limit : undefined });
      return { textForLLM: JSON.stringify(result), uiBlock: { type: "email_list", title: "Emails projet récents", mailbox: result.mailbox, emails: result.emails, emptyText: "Aucun email correspondant." } };
    },
  },
  {
    name: "read_external_gmail_email",
    description: "Lit un email Gmail précis à partir du messageId retourné par list_external_gmail_emails. Lecture seule. Utiliser avant d'en extraire une action ou décision Roadmap 2.",
    input_schema: { type: "object", properties: { messageId: { type: "string" } }, required: ["messageId"] },
    execute: async (ctx, args) => {
      const email = await readExternalGmailEmail(ctx, { messageId: String(args.messageId ?? "") });
      const emailCard = { messageId: email.messageId, threadId: email.threadId, from: email.from, subject: email.subject, receivedAt: email.receivedAt, snippet: email.snippet, unread: email.unread };
      return { textForLLM: JSON.stringify(email), uiBlock: { type: "email_list", title: "Email analysé", emails: [emailCard] } };
    },
  },
  {
    name: "send_external_gmail",
    description: "Envoie un email depuis le Gmail personnel connecté du super-admin. Action définitive réservée au pilotage Roadmap 2 : toujours présenter le destinataire, l'objet et le corps puis attendre la validation humaine.",
    sensitive: true,
    input_schema: { type: "object", properties: { workspaceKey: { type: "string" }, nodeId: { type: "string" }, to: { type: "array", items: { type: "string" } }, cc: { type: "array", items: { type: "string" } }, bcc: { type: "array", items: { type: "string" } }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] },
    execute: async (ctx, args, execution) => {
      if (!execution?.approvalId) throw new Error("Validation d’envoi manquante.");
      const { workspaceId } = await resolveRoadmap2Context(workspaceKey(args));
      const result = await sendExternalGmail(ctx, { workspaceId, approvalId: execution.approvalId, nodeId: args.nodeId ? String(args.nodeId) : undefined, to: Array.isArray(args.to) ? args.to.map(String) : [], cc: Array.isArray(args.cc) ? args.cc.map(String) : undefined, bcc: Array.isArray(args.bcc) ? args.bcc.map(String) : undefined, subject: String(args.subject ?? ""), body: String(args.body ?? "") });
      return { textForLLM: JSON.stringify(result) };
    },
  },
];
