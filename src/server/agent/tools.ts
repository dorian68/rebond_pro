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
import { DOC_LABELS, GENERATABLE_DOCUMENT_TYPES } from "@/lib/document-types";
import { DOCUMENT_CATALOG_BY_TYPE } from "@/lib/document-catalog";
import { DOCUMENT_INTAKE_ROUTES, DOCUMENT_INTAKE_TARGETS, type DocumentIntakeTarget } from "@/lib/document-intake";
import { createExternalCalendarEvent, createExternalDocument, createExternalEmailDraft, importExternalDocument, listConnectorStatuses, listExternalCalendarEvents, searchExternalDocuments, sendExternalEmail } from "@/server/connectors";

export type ToolResult = { textForLLM: string; uiBlock?: UIBlock; custom?: { name: string; value: unknown } };

export type AgentTool = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  sensitive?: boolean;
  execute: (ctx: TenantContext, args: Record<string, unknown>) => Promise<ToolResult>;
};

const APP_MAP = {
  domain: "Espace partenaires pour centres de formation (Le Bon Rebond)",
  routes: [
    { path: "/dashboard", desc: "Indicateurs business + alertes + priorités" },
    { path: "/formations", desc: "Catalogue de formations (CRUD, page publique)" },
    { path: "/sessions", desc: "Sessions (dates, formateur, remplissage, statut)" },
    { path: "/planning", desc: "Calendrier hebdo, conflits, meilleurs créneaux" },
    { path: "/prospects", desc: "CRM pipeline Kanban" },
    { path: "/apprenants", desc: "Apprenants & inscriptions" },
    { path: "/documents", desc: "Génération de documents PDF ou DOCX à partir des données cockpit et des modèles du centre" },
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
        const f = await prisma.formation.findFirst({
          where: w,
          include: {
            eligibleTrainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true } } } },
            modules: { orderBy: { position: "asc" }, include: { trainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true } } } } } },
          },
        });
        if (f) {
          block = { type: "entity_card", entityType, title: f.title, subtitle: MODALITY_LABELS[f.modality], href: `/formations/${f.id}`, color: f.color ?? undefined, fields: [{ label: "Prix", value: formatMoney(f.price) }, { label: "Durée", value: f.durationDays ? `${f.durationDays} j` : "—" }, { label: "Modules", value: String(f.modules.length) }] };
          const detail = {
            found: true, id: f.id, title: f.title, status: f.status, modality: f.modality, level: f.level, price: f.price,
            durationDays: f.durationDays, durationHours: f.durationHours,
            objectives: f.objectives, program: f.program, targetAudience: f.targetAudience, prerequisites: f.prerequisites,
            eligibleTrainers: f.eligibleTrainers.map((e) => ({ id: e.trainer.id, name: `${e.trainer.firstName} ${e.trainer.lastName}` })),
            modules: f.modules.map((m) => ({ id: m.id, title: m.title, description: m.description, durationDays: m.durationDays, durationHours: m.durationHours, trainers: m.trainers.map((t) => ({ id: t.trainer.id, name: `${t.trainer.firstName} ${t.trainer.lastName}` })) })),
          };
          return { textForLLM: JSON.stringify(detail).slice(0, 4000), uiBlock: block };
        }
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
    description: "Optimise le planning d'une formation : propose les meilleurs créneaux en croisant disponibilités et salles. Prend en compte TOUS les formateurs éligibles de la formation (et, pour les formations à modules, le vivier de formateurs capables d'animer chaque module) afin de maximiser les options et éviter les conflits — une formation peut être animée par plusieurs formateurs. Pour « optimiser le planning », appelle cet outil pour chaque formation concernée. Argument: formationId.",
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
  {
    name: "list_external_connectors",
    description: "Liste les connecteurs externes disponibles et leur statut pour l'utilisateur courant : Google Calendar, Google Drive, Gmail, Outlook, OneDrive, SharePoint, Microsoft Calendar.",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => {
      const statuses = await listConnectorStatuses(ctx);
      const block: UIBlock = {
        type: "data_table",
        title: "Connecteurs externes",
        columns: ["Connecteur", "Statut", "Politique"],
        rows: statuses.connectors.map((c) => [c.label, c.connected ? "Connecté" : c.status === "DISABLED" ? "Désactivé" : "À connecter", c.writePolicy === "READ_ONLY" ? "Lecture seule" : c.writePolicy === "SEND" ? "Brouillon + envoi" : c.writePolicy === "WRITE" ? "Lecture + écriture" : "Brouillon uniquement"]),
        emptyText: "Aucun connecteur configuré.",
      };
      return { textForLLM: JSON.stringify(statuses), uiBlock: block };
    },
  },
  {
    name: "list_external_calendar_events",
    description: "Lit les événements d'un agenda externe connecté en lecture seule. connector ∈ {google_calendar, microsoft_calendar}. N'écrit jamais dans le calendrier.",
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["google_calendar", "microsoft_calendar"] },
        scope: { type: "string", enum: ["personal", "organization"], description: "personal = compte de l'utilisateur ; organization = compte partagé du centre." },
        from: { type: "string", description: "Date/heure ISO de début optionnelle." },
        to: { type: "string", description: "Date/heure ISO de fin optionnelle." },
        limit: { type: "number" },
      },
      required: ["connector"],
    },
    execute: async (ctx, args) => {
      const result = await listExternalCalendarEvents(ctx, {
        connector: String(args.connector) as "google_calendar" | "microsoft_calendar",
        scope: args.scope === "organization" ? "organization" : "personal",
        from: args.from ? String(args.from) : undefined,
        to: args.to ? String(args.to) : undefined,
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
      return { textForLLM: JSON.stringify(result).slice(0, 4000) };
    },
  },
  {
    name: "search_external_documents",
    description: "Recherche des fichiers dans un espace documentaire externe connecté. connector ∈ {google_drive, onedrive, sharepoint}. Lecture seule.",
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["google_drive", "onedrive", "sharepoint"] },
        scope: { type: "string", enum: ["personal", "organization"], description: "personal = documents de l'utilisateur ; organization = documents partagés du centre. Par défaut, utiliser organization pour les documents du centre." },
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["connector", "query"],
    },
    execute: async (ctx, args) => {
      const result = await searchExternalDocuments(ctx, {
        connector: String(args.connector) as "google_drive" | "onedrive" | "sharepoint",
        // Sans centre rattaché (ex. super-admin), seul le périmètre personnel est possible.
        scope: !ctx.organizationId || args.scope === "personal" ? "personal" : "organization",
        query: String(args.query ?? ""),
        limit: typeof args.limit === "number" ? args.limit : undefined,
      });
      return { textForLLM: JSON.stringify(result).slice(0, 4000) };
    },
  },
  {
    name: "import_external_document",
    description: "Importe le contenu d'un fichier externe connecté dans le contexte de Socrate pour aider à préremplir ou analyser. N'enregistre rien en base sans outil séparé.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["google_drive", "onedrive", "sharepoint"] },
        scope: { type: "string", enum: ["personal", "organization"], description: "Même périmètre que la recherche ayant trouvé le fichier." },
        fileId: { type: "string" },
      },
      required: ["connector", "fileId"],
    },
    execute: async (ctx, args) => {
      const result = await importExternalDocument(ctx, {
        connector: String(args.connector) as "google_drive" | "onedrive" | "sharepoint",
        // Sans centre rattaché (ex. super-admin), seul le périmètre personnel est possible.
        scope: !ctx.organizationId || args.scope === "personal" ? "personal" : "organization",
        fileId: String(args.fileId ?? ""),
      });
      return { textForLLM: JSON.stringify(result).slice(0, 6000) };
    },
  },
  {
    name: "create_external_email_draft",
    description: "Crée un brouillon email dans Gmail ou Outlook. NE JAMAIS envoyer d'email : cet outil prépare uniquement un brouillon validable par l'utilisateur.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["gmail", "outlook"] },
        to: { type: "array", items: { type: "string" } },
        cc: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["connector", "to", "subject", "body"],
    },
    execute: async (ctx, args) => {
      const result = await createExternalEmailDraft(ctx, {
        connector: String(args.connector) as "gmail" | "outlook",
        to: Array.isArray(args.to) ? args.to.map(String) : [],
        cc: Array.isArray(args.cc) ? args.cc.map(String) : undefined,
        subject: String(args.subject ?? ""),
        body: String(args.body ?? ""),
      });
      return { textForLLM: `Brouillon email créé. Résultat connecteur : ${JSON.stringify(result).slice(0, 2000)}` };
    },
  },
  {
    name: "send_external_email",
    description: "Envoie un email via Gmail ou Outlook (envoi RÉEL, pas un brouillon). ACTION SENSIBLE : déclenche une carte de validation humaine avant l'envoi. À n'utiliser que lorsque l'utilisateur demande explicitement d'envoyer ; sinon privilégie create_external_email_draft pour qu'il relise.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["gmail", "outlook"] },
        to: { type: "array", items: { type: "string" } },
        cc: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["connector", "to", "subject", "body"],
    },
    execute: async (ctx, args) => {
      const result = await sendExternalEmail(ctx, {
        connector: String(args.connector) as "gmail" | "outlook",
        to: Array.isArray(args.to) ? args.to.map(String) : [],
        cc: Array.isArray(args.cc) ? args.cc.map(String) : undefined,
        subject: String(args.subject ?? ""),
        body: String(args.body ?? ""),
      });
      return { textForLLM: `Email envoyé. Résultat connecteur : ${JSON.stringify(result).slice(0, 2000)}` };
    },
  },
  {
    name: "create_external_calendar_event",
    description: "Crée un événement dans un agenda externe connecté (Google Calendar ou Microsoft Calendar). ACTION SENSIBLE : déclenche une carte de validation humaine avant création. Fournir start (et idéalement end) au format ISO 8601. Si end est omis, durée par défaut 60 min.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["google_calendar", "microsoft_calendar"] },
        scope: { type: "string", enum: ["personal", "organization"], description: "personal = agenda de l'utilisateur ; organization = agenda partagé du centre." },
        title: { type: "string" },
        start: { type: "string", description: "Date/heure de début ISO 8601 (ex: 2026-07-01T10:00:00)." },
        end: { type: "string", description: "Date/heure de fin ISO 8601 optionnelle." },
        description: { type: "string" },
        location: { type: "string" },
        attendees: { type: "array", items: { type: "string" }, description: "Emails des participants." },
        timezone: { type: "string", description: "Fuseau IANA, défaut Europe/Paris." },
      },
      required: ["connector", "title", "start"],
    },
    execute: async (ctx, args) => {
      const result = await createExternalCalendarEvent(ctx, {
        connector: String(args.connector) as "google_calendar" | "microsoft_calendar",
        scope: !ctx.organizationId || args.scope === "personal" ? "personal" : args.scope === "organization" ? "organization" : undefined,
        title: String(args.title ?? ""),
        start: String(args.start ?? ""),
        end: args.end ? String(args.end) : undefined,
        description: args.description ? String(args.description) : undefined,
        location: args.location ? String(args.location) : undefined,
        attendees: Array.isArray(args.attendees) ? args.attendees.map(String) : undefined,
        timezone: args.timezone ? String(args.timezone) : undefined,
      });
      return { textForLLM: `Événement créé. Résultat connecteur : ${JSON.stringify(result).slice(0, 2000)}` };
    },
  },
  {
    name: "create_external_document",
    description: "Crée un document texte dans Google Drive (à partir d'un contenu textuel). ACTION SENSIBLE : déclenche une carte de validation humaine avant création. Pour déposer un fichier binaire existant (PDF généré), un autre flux est nécessaire.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        connector: { type: "string", enum: ["google_drive"] },
        scope: { type: "string", enum: ["personal", "organization"], description: "personal = Drive de l'utilisateur ; organization = Drive partagé du centre." },
        fileName: { type: "string" },
        content: { type: "string", description: "Contenu textuel du document." },
        mimeType: { type: "string", description: "Type MIME optionnel (ex: text/plain, application/vnd.google-apps.document)." },
      },
      required: ["connector", "fileName", "content"],
    },
    execute: async (ctx, args) => {
      const result = await createExternalDocument(ctx, {
        connector: "google_drive",
        scope: !ctx.organizationId || args.scope === "personal" ? "personal" : args.scope === "organization" ? "organization" : undefined,
        fileName: String(args.fileName ?? ""),
        content: String(args.content ?? ""),
        mimeType: args.mimeType ? String(args.mimeType) : undefined,
      });
      return { textForLLM: `Document créé. Résultat connecteur : ${JSON.stringify(result).slice(0, 2000)}` };
    },
  },
  // ---- Actions sensibles (human-in-the-loop) ----
  {
    name: "list_document_templates",
    description: "Liste les modèles de documents disponibles pour le centre, notamment les modèles DOCX importés utilisables par generate_document.",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => {
      const templates = await prisma.documentTemplate.findMany({
        where: { OR: [{ organizationId: ctx.organizationId }, { organizationId: null }] },
        orderBy: [{ type: "asc" }, { organizationId: "desc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
        select: { id: true, organizationId: true, type: true, name: true, engine: true, sourceFileName: true, variables: true, isDefault: true, status: true },
      });
      const mapped = templates.map((t) => ({
        ...t,
        label: DOC_LABELS[t.type] ?? t.type,
        scope: DOCUMENT_CATALOG_BY_TYPE[t.type]?.scope ?? "SESSION",
        contexts: DOCUMENT_CATALOG_BY_TYPE[t.type]?.contexts ?? [],
        origin: t.organizationId ? "tenant" : "platform_default",
      }));
      const block: UIBlock = {
        type: "data_table",
        title: "Modèles de documents",
        columns: ["Type", "Nom", "Origine", "Contexte"],
        rows: mapped.map((t) => [t.label, `${t.name}${t.isDefault ? " · défaut" : ""}`, t.origin === "tenant" ? "Centre" : "Plateforme", t.contexts.join(", ") || t.scope]),
        emptyText: "Aucun modèle importé.",
      };
      // Sortie COMPACTE pour le LLM : la liste complète (~50 modèles) doit tenir sous la
      // troncature à 4000 caractères des résultats d'outils — sinon Socrate ne « voit »
      // que les premiers modèles et croit ne pas avoir accès aux autres.
      const textForLLM = mapped.length === 0
        ? "Aucun modèle de document disponible (ni centre, ni plateforme)."
        : `${mapped.length} modèle(s) de document disponibles (centre + plateforme), utilisables par generate_document :\n`
          + mapped.map((t) => `- ${t.type} — « ${t.name} »${t.isDefault ? " (défaut)" : ""} [${t.origin === "tenant" ? "centre" : "plateforme"}, ${t.engine}]`).join("\n");
      return { textForLLM, uiBlock: block };
    },
  },
  {
    name: "preflight_document_generation",
    description: "Analyse le modèle qui serait utilisé pour un type de document et liste les variables remplies/manquantes avant génération. Utiliser avant generate_document.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: GENERATABLE_DOCUMENT_TYPES },
        sessionId: { type: "string", description: "Optionnel. Requis pour les documents de session ou par apprenant." },
        templateId: { type: "string" },
        manualOverrides: { type: "object" },
      },
      required: ["type"],
    },
    execute: async (ctx, args) => {
      const { getDocumentGenerationPreflight } = await import("@/server/documents/document-context");
      const preflight = await getDocumentGenerationPreflight({
        ctx,
        type: String(args.type),
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        templateId: args.templateId ? String(args.templateId) : undefined,
        manualOverrides: args.manualOverrides && typeof args.manualOverrides === "object" ? args.manualOverrides : undefined,
      });
      const catalog = DOCUMENT_CATALOG_BY_TYPE[String(args.type)];
      const block: UIBlock = {
        type: "data_table",
        title: `Préflight — ${DOC_LABELS[String(args.type)] ?? String(args.type)}`,
        columns: ["Statut", "Valeur"],
        rows: [
          ["Modèle", `${preflight.template.name} (${preflight.template.organizationId ? "centre" : preflight.template.isBuiltin ? "intégré" : "plateforme"})`],
          ["Contexte", catalog?.contexts.join(", ") ?? "—"],
          ["Complétude", `${preflight.completionStatus} · ${preflight.completionScore}%`],
          ["Variables remplies", String(preflight.filledVariables.length)],
          ["Variables manquantes", preflight.missingVariables.map((m) => m.label).slice(0, 8).join(", ") || "Aucune"],
        ],
      };
      return { textForLLM: JSON.stringify({ catalog, preflight }).slice(0, 6000), uiBlock: block };
    },
  },
  {
    name: "generate_document",
    description: "Génère un document officiel. Utilise le modèle DOCX du centre si disponible, sinon le modèle plateforme, sinon le PDF intégré. ACTION SENSIBLE : nécessite validation humaine. Fournir sessionId pour les documents de session/apprenant.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: GENERATABLE_DOCUMENT_TYPES },
        sessionId: { type: "string" },
        templateId: { type: "string" },
        manualOverrides: { type: "object" },
      },
      required: ["type"],
    },
    execute: async (ctx, args) => {
      const { generateDocumentFromAgent } = await import("@/server/documents-actions");
      const result = await generateDocumentFromAgent({
        ctx,
        type: String(args.type),
        sessionId: args.sessionId ? String(args.sessionId) : undefined,
        templateId: args.templateId ? String(args.templateId) : undefined,
        manualOverrides: args.manualOverrides && typeof args.manualOverrides === "object" ? args.manualOverrides : undefined,
      });
      if (!result.ok) {
        return { textForLLM: `Génération impossible : ${result.error ?? "erreur inconnue"}.` };
      }
      return { textForLLM: `${result.message} IDs: ${(result.documentIds ?? []).join(", ")}`, custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "upload_document_to_drive",
    description: "Dépose un document déjà généré (PDF ou DOCX, identifié par son documentId) dans Google Drive connecté. ACTION SENSIBLE : carte de validation avant dépôt. Mets forClient=true pour retirer les instructions/notes de modèle si le fichier est destiné à un client.",
    sensitive: true,
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        scope: { type: "string", enum: ["personal", "organization"], description: "personal = Drive de l'utilisateur ; organization = Drive partagé du centre (défaut)." },
        folderId: { type: "string", description: "ID du dossier Drive cible (optionnel)." },
        forClient: { type: "boolean", description: "true = version nettoyée (sans instructions de modèle) pour remise client." },
      },
      required: ["documentId"],
    },
    execute: async (ctx, args) => {
      const { uploadDocumentToDrive } = await import("@/server/documents-actions");
      const result = await uploadDocumentToDrive({
        ctx,
        documentId: String(args.documentId),
        scope: !ctx.organizationId || args.scope === "personal" ? "personal" : "organization",
        folderId: args.folderId ? String(args.folderId) : undefined,
        forClient: args.forClient === true,
      });
      return { textForLLM: result.ok ? "Document déposé dans Google Drive." : `Dépôt impossible : ${result.error ?? "erreur inconnue"}.` };
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
    name: "prepare_form_draft",
    description: "Prépare un brouillon de formulaire à partir de la conversation ou d'un document partagé. N'enregistre rien en base. Utiliser quand l'utilisateur veut préremplir créer une formation/session/prospect/apprenant/bénéficiaire/formateur depuis un document.",
    input_schema: {
      type: "object",
      properties: {
        target: { type: "string", enum: DOCUMENT_INTAKE_TARGETS },
        fields: { type: "object", description: "Champs à préremplir, uniquement ceux du formulaire cible." },
        confidence: { type: "number" },
        missingFields: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
        evidence: { type: "array", items: { type: "object", properties: { field: { type: "string" }, quote: { type: "string" } } } },
      },
      required: ["target", "fields"],
    },
    execute: async (_ctx, args) => {
      const target = String(args.target) as DocumentIntakeTarget;
      if (!(DOCUMENT_INTAKE_TARGETS as readonly string[]).includes(target)) return { textForLLM: "Cible de formulaire invalide." };
      const fields = args.fields && typeof args.fields === "object" ? args.fields as Record<string, unknown> : {};
      return {
        textForLLM: `Brouillon ${target} préparé. Le formulaire va être ouvert pour validation humaine avant enregistrement.`,
        custom: {
          name: "app.form_draft",
          value: {
            target,
            path: DOCUMENT_INTAKE_ROUTES[target],
            fields,
            confidence: typeof args.confidence === "number" ? args.confidence : 0.75,
            missingFields: Array.isArray(args.missingFields) ? args.missingFields : [],
            warnings: Array.isArray(args.warnings) ? args.warnings : ["Brouillon préparé par Socrate. Vérifiez avant enregistrement."],
            evidence: Array.isArray(args.evidence) ? args.evidence : [],
          },
        },
      };
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
