import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { getDashboardMetrics } from "@/server/metrics";
import { findBestSlots } from "@/server/planning";
import { formatMoney, formatDateRange } from "@/lib/utils";
import { MODALITY_LABELS, PROSPECT_STAGE_LABELS } from "@/lib/labels";
import type { UIBlock } from "@/lib/ag-ui/types";
import { WRITE_TOOLS } from "@/server/agent/write-tools";
import { PERSONA_TOOLS } from "@/server/agent/persona-tools";

export type ToolResult = { textForLLM: string; uiBlock?: UIBlock; custom?: { name: string; value: unknown } };

export type AgentTool = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  sensitive?: boolean;
  execute: (ctx: TenantContext, args: Record<string, unknown>) => Promise<ToolResult>;
};

const APP_MAP = {
  domain: "Cockpit SaaS pour centres de formation (RebondPro Formation)",
  routes: [
    { path: "/dashboard", desc: "Indicateurs business + alertes + priorités" },
    { path: "/formations", desc: "Catalogue de formations (CRUD, page publique)" },
    { path: "/sessions", desc: "Sessions (dates, formateur, remplissage, statut)" },
    { path: "/planning", desc: "Calendrier hebdo, conflits, meilleurs créneaux" },
    { path: "/prospects", desc: "CRM pipeline Kanban" },
    { path: "/apprenants", desc: "Apprenants & inscriptions" },
    { path: "/documents", desc: "Génération de documents PDF" },
    { path: "/qualite", desc: "Indicateurs qualité" },
    { path: "/formateurs", desc: "Formateurs & disponibilités" },
    { path: "/assistant", desc: "Assistant IA (page dédiée)" },
  ],
  entities: ["formation", "session", "prospect", "learner", "trainer"],
};

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "get_app_map",
    description: "Retourne la carte de l'application : routes, modules et entités métier disponibles. Utiliser pour orienter l'utilisateur.",
    input_schema: { type: "object", properties: {} },
    execute: async () => ({ textForLLM: JSON.stringify(APP_MAP) }),
  },
  {
    name: "get_current_user_context",
    description: "Retourne le contexte de l'utilisateur connecté et de son centre (rôle, organisation) sans aucun secret.",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => ({
      textForLLM: JSON.stringify({ name: ctx.name, role: ctx.role, organization: ctx.organizationName, organizationSlug: ctx.organizationSlug }),
    }),
  },
  {
    name: "get_dashboard_metrics",
    description: "Retourne les indicateurs business temps réel du centre : CA prévisionnel, sessions à venir, remplissage moyen, prospects actifs, relances, documents à générer, alertes.",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => {
      const m = await getDashboardMetrics(ctx);
      const block: UIBlock = {
        type: "metric_grid",
        title: "Indicateurs du centre",
        metrics: [
          { label: "CA prévisionnel", value: formatMoney(m.kpis.caForecast), tone: "positive" },
          { label: "Sessions à venir", value: String(m.kpis.sessionsAVenir) },
          { label: "Remplissage moyen", value: `${m.kpis.avgFill} %`, tone: m.kpis.avgFill < 50 ? "warn" : "default" },
          { label: "Prospects actifs", value: String(m.kpis.prospectsActifs) },
          { label: "Relances à faire", value: String(m.kpis.relances), tone: m.kpis.relances > 0 ? "warn" : "default" },
          { label: "Docs à générer", value: String(m.kpis.docsToGenerate), tone: m.kpis.docsToGenerate > 0 ? "warn" : "default" },
        ],
      };
      return { textForLLM: JSON.stringify({ ...m.kpis, alerts: m.alerts.map((a) => a.title), priorities: m.priorities.map((p) => p.text) }), uiBlock: block };
    },
  },
  {
    name: "search_entities",
    description: "Recherche des entités métier. entityType ∈ {formation, session, prospect, learner, trainer}. query = texte libre optionnel.",
    input_schema: {
      type: "object",
      properties: {
        entityType: { type: "string", enum: ["formation", "session", "prospect", "learner", "trainer"] },
        query: { type: "string" },
      },
      required: ["entityType"],
    },
    execute: async (ctx, args) => {
      const entityType = String(args.entityType);
      const q = String(args.query ?? "").trim();
      const where = { organizationId: ctx.organizationId, deletedAt: null } as const;
      let columns: string[] = [];
      let rows: string[][] = [];
      let llmItems: { id: string; label: string }[] = [];

      if (entityType === "formation") {
        const items = await prisma.formation.findMany({ where: { ...where, ...(q ? { title: { contains: q, mode: "insensitive" } } : {}) }, take: 10, orderBy: { title: "asc" } });
        columns = ["Titre", "Modalité", "Prix"];
        rows = items.map((f) => [f.title, MODALITY_LABELS[f.modality], formatMoney(f.price)]);
        llmItems = items.map((f) => ({ id: f.id, label: f.title }));
      } else if (entityType === "session") {
        const items = await prisma.session.findMany({ where: { ...where, status: { not: "ANNULEE" } }, include: { formation: { select: { title: true } }, _count: { select: { enrollments: true } } }, take: 10, orderBy: { startDate: "asc" } });
        columns = ["Formation", "Dates", "Inscrits"];
        rows = items.map((s) => [s.formation.title, formatDateRange(s.startDate, s.endDate), `${s._count.enrollments}/${s.capacity}`]);
        llmItems = items.map((s) => ({ id: s.id, label: `${s.formation.title} (${formatDateRange(s.startDate, s.endDate)})` }));
      } else if (entityType === "prospect") {
        const items = await prisma.prospect.findMany({ where: { ...where, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) }, take: 10, orderBy: { updatedAt: "desc" } });
        columns = ["Nom", "Étape", "Montant"];
        rows = items.map((p) => [p.name, PROSPECT_STAGE_LABELS[p.stage], formatMoney(p.potentialAmount)]);
        llmItems = items.map((p) => ({ id: p.id, label: p.name }));
      } else if (entityType === "learner") {
        const items = await prisma.learner.findMany({ where: { ...where, ...(q ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] } : {}) }, take: 10, orderBy: { lastName: "asc" } });
        columns = ["Nom", "Entreprise", "Email"];
        rows = items.map((l) => [`${l.firstName} ${l.lastName}`, l.company ?? "—", l.email ?? "—"]);
        llmItems = items.map((l) => ({ id: l.id, label: `${l.firstName} ${l.lastName}` }));
      } else {
        const items = await prisma.trainer.findMany({ where: { ...where, active: true }, take: 10, orderBy: { lastName: "asc" } });
        columns = ["Nom", "Spécialités"];
        rows = items.map((t) => [`${t.firstName} ${t.lastName}`, t.specialities.join(", ")]);
        llmItems = items.map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName}` }));
      }

      const block: UIBlock = { type: "data_table", title: `Résultats — ${entityType}`, columns, rows, emptyText: "Aucun résultat." };
      // Les IDs sont fournis au LLM (pas affichés dans le tableau) pour permettre les actions ciblées.
      return { textForLLM: JSON.stringify({ count: llmItems.length, items: llmItems }), uiBlock: block };
    },
  },
  {
    name: "read_entity",
    description: "Lit le détail d'une entité métier par son id. entityType ∈ {formation, session, prospect, learner, trainer}.",
    input_schema: {
      type: "object",
      properties: { entityType: { type: "string" }, id: { type: "string" } },
      required: ["entityType", "id"],
    },
    execute: async (ctx, args) => {
      const entityType = String(args.entityType);
      const id = String(args.id);
      const w = { id, organizationId: ctx.organizationId } as const;
      let block: UIBlock | undefined;
      let summary = "";

      if (entityType === "formation") {
        const f = await prisma.formation.findFirst({ where: w });
        if (f) { block = { type: "entity_card", entityType, title: f.title, subtitle: MODALITY_LABELS[f.modality], href: `/formations/${f.id}`, color: f.color ?? undefined, fields: [{ label: "Prix", value: formatMoney(f.price) }, { label: "Durée", value: f.durationDays ? `${f.durationDays} j` : "—" }] }; summary = f.title; }
      } else if (entityType === "prospect") {
        const p = await prisma.prospect.findFirst({ where: w, include: { formationOfInterest: { select: { title: true } } } });
        if (p) { block = { type: "entity_card", entityType, title: p.name, subtitle: PROSPECT_STAGE_LABELS[p.stage], href: `/prospects/${p.id}`, fields: [{ label: "Contact", value: p.contactName ?? "—" }, { label: "Montant", value: formatMoney(p.potentialAmount) }, { label: "Formation", value: p.formationOfInterest?.title ?? "—" }] }; summary = p.name; }
      } else if (entityType === "learner") {
        const l = await prisma.learner.findFirst({ where: w });
        if (l) { block = { type: "entity_card", entityType, title: `${l.firstName} ${l.lastName}`, subtitle: l.company ?? undefined, href: `/apprenants/${l.id}`, fields: [{ label: "Email", value: l.email ?? "—" }] }; summary = `${l.firstName} ${l.lastName}`; }
      } else if (entityType === "trainer") {
        const t = await prisma.trainer.findFirst({ where: w });
        if (t) { block = { type: "entity_card", entityType, title: `${t.firstName} ${t.lastName}`, subtitle: t.specialities.join(", "), href: `/formateurs/${t.id}`, color: t.color ?? undefined }; summary = `${t.firstName} ${t.lastName}`; }
      } else if (entityType === "session") {
        const s = await prisma.session.findFirst({ where: w, include: { formation: { select: { title: true } }, trainer: { select: { firstName: true, lastName: true } }, enrollments: { include: { learner: { select: { firstName: true, lastName: true } } } } } });
        if (s) {
          block = { type: "entity_card", entityType, title: s.formation.title, subtitle: formatDateRange(s.startDate, s.endDate), href: `/sessions/${s.id}`, fields: [{ label: "Inscrits", value: `${s.enrollments.length}/${s.capacity}` }, { label: "Statut", value: s.status }] };
          summary = s.formation.title;
          // Détail enrichi pour le LLM (inscriptions avec leurs IDs pour émargement/désinscription)
          const detail = { found: true, id: s.id, formation: s.formation.title, trainerId: s.trainerId, trainerConfirmed: s.trainerConfirmed, status: s.status, capacity: s.capacity, enrollments: s.enrollments.map((e) => ({ enrollmentId: e.id, learnerId: e.learnerId, learner: `${e.learner.firstName} ${e.learner.lastName}`, status: e.status })) };
          return { textForLLM: JSON.stringify(detail), uiBlock: block };
        }
      }

      if (!block) return { textForLLM: "Entité introuvable." };
      return { textForLLM: JSON.stringify({ found: true, id, summary }), uiBlock: block };
    },
  },
  {
    name: "find_best_slots",
    description: "Propose les meilleurs créneaux pour programmer une session d'une formation (croise disponibilités formateurs et salles). Argument: formationId.",
    input_schema: { type: "object", properties: { formationId: { type: "string" } }, required: ["formationId"] },
    execute: async (ctx, args) => {
      const slots = await findBestSlots(ctx, String(args.formationId));
      const block: UIBlock = {
        type: "data_table",
        title: "Meilleurs créneaux",
        columns: ["Date", "Formateur", "Score", "Note"],
        rows: slots.map((s) => [s.date, s.trainerName, `${s.score}`, s.reason]),
        emptyText: "Aucun créneau compatible trouvé.",
      };
      return { textForLLM: JSON.stringify(slots), uiBlock: block };
    },
  },
  // ---- Actions sensibles (human-in-the-loop) ----
  {
    name: "generate_document",
    description: "Génère un document officiel (convocation, attestation, convention, programme, émargement, devis) pour une session. ACTION SENSIBLE : nécessite validation humaine.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["CONVOCATION", "ATTESTATION", "CONVENTION", "PROGRAMME", "EMARGEMENT", "DEVIS"] },
        sessionId: { type: "string" },
      },
      required: ["type", "sessionId"],
    },
    execute: async (ctx, args) => {
      const { generateDocuments } = await import("@/server/documents-actions");
      const fd = new FormData();
      fd.set("type", String(args.type));
      fd.set("sessionId", String(args.sessionId));
      await generateDocuments(fd);
      return { textForLLM: `Document ${args.type} généré pour la session ${args.sessionId}.`, custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "move_prospect_stage",
    description: "Déplace un prospect vers une autre étape du pipeline. ACTION SENSIBLE : nécessite validation humaine. stage ∈ {NOUVEAU, CONTACTE, DEVIS, RELANCE, GAGNE, PERDU}.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: { prospectId: { type: "string" }, stage: { type: "string", enum: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE", "GAGNE", "PERDU"] } },
      required: ["prospectId", "stage"],
    },
    execute: async (ctx, args) => {
      const { moveProspect } = await import("@/server/prospects-actions");
      await moveProspect(String(args.prospectId), String(args.stage));
      return { textForLLM: `Prospect ${args.prospectId} déplacé vers ${args.stage}.`, custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "navigate_to",
    description: "Demande à l'interface de naviguer vers une route de l'application (ex: /prospects, /sessions). Utiliser pour guider l'utilisateur.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    execute: async (_ctx, args) => {
      const path = String(args.path);
      return { textForLLM: `Navigation demandée vers ${path}.`, custom: { name: "app.navigate", value: { path } } };
    },
  },
  // ---- Outils d'écriture / CRUD complet (sensibles, human-in-the-loop) ----
  ...WRITE_TOOLS,
  // ---- Outils par persona (lecture + actions ciblées) ----
  ...PERSONA_TOOLS,
];

export function getTool(name: string): AgentTool | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}

export function isSensitive(name: string): boolean {
  return !!getTool(name)?.sensitive;
}
