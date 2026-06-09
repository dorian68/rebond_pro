import "server-only";
import { prisma } from "@/lib/prisma";
import { getMarketplaceFormations } from "@/server/marketplace";
import { getPlatformAdmin } from "@/lib/platform";
import { getPlatformOverview } from "@/server/platform";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";
import type { AgentTool } from "@/server/agent/tools";
import type { UIBlock } from "@/lib/ag-ui/types";

/**
 * Outils additionnels par persona (lecture, sûrs).
 * Les outils "public_*" n'utilisent JAMAIS le tenant (visiteurs non authentifiés).
 */
export const PERSONA_TOOLS: AgentTool[] = [
  {
    name: "search_catalog",
    description: "Recherche dans le catalogue PUBLIC de formations du réseau (tous centres). Argument: query (texte), category (optionnel). Aucune donnée privée.",
    input_schema: { type: "object", properties: { query: { type: "string" }, category: { type: "string" } } },
    execute: async (_ctx, args) => {
      const items = await getMarketplaceFormations({ q: String(args.query ?? "") || undefined, category: String(args.category ?? "") || undefined });
      const rows = items.slice(0, 12).map((f) => [f.title, f.organization.name, MODALITY_LABELS[f.modality], formatMoney(f.price)]);
      const block: UIBlock = { type: "data_table", title: "Catalogue du réseau", columns: ["Formation", "Centre", "Modalité", "Prix"], rows, emptyText: "Aucune formation trouvée." };
      return { textForLLM: JSON.stringify({ count: items.length, items: items.slice(0, 12).map((f) => ({ title: f.title, center: f.organization.name, url: `/${f.organization.slug}/f/${f.publicSlug ?? f.slug}`, price: formatMoney(f.price), level: LEVEL_LABELS[f.level] })) }), uiBlock: block };
    },
  },
  {
    name: "bilan_info",
    description: "Donne les informations clés sur le bilan de compétences (déroulé, phases légales, financement CPF). Pour informer un visiteur ou un bénéficiaire.",
    input_schema: { type: "object", properties: {} },
    execute: async () => ({
      textForLLM: JSON.stringify({
        definition: "Le bilan de compétences permet d'analyser ses compétences, aptitudes et motivations pour définir un projet professionnel et, si besoin, un projet de formation.",
        phases: ["Phase préliminaire : analyse de la demande et du besoin", "Phase d'investigation : compétences, motivations, pistes", "Phase de conclusion : projet et plan d'action + document de synthèse"],
        duree: "Généralement 24h réparties sur plusieurs semaines.",
        financement: "Éligible au CPF (Compte Personnel de Formation).",
        cta: "Vous pouvez demander un RDV gratuit de 45 min via la page Contact.",
      }),
    }),
  },
  {
    name: "get_my_bilan",
    description: "Retourne l'avancement du bilan de compétences du bénéficiaire connecté (progression, prochaine étape).",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => {
      const ben = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId }, include: { steps: { orderBy: { order: "asc" } } } });
      if (!ben) return { textForLLM: "Aucun accompagnement bilan lié à ce compte." };
      const total = ben.steps.length, done = ben.steps.filter((s) => s.status === "done").length;
      const next = ben.steps.find((s) => s.status !== "done");
      return { textForLLM: JSON.stringify({ progress: total ? Math.round((done / total) * 100) : 0, done, total, nextStep: next?.title ?? "Parcours terminé", objective: ben.objective }) };
    },
  },
  {
    name: "save_formation_to_catalog",
    description: "Enregistre une formation publique (par id) dans les favoris du bénéficiaire connecté. ACTION SENSIBLE.",
    sensitive: true,
    input_schema: { type: "object", properties: { formationId: { type: "string" } }, required: ["formationId"] },
    execute: async (ctx, args) => {
      const ben = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId } });
      if (!ben) return { textForLLM: "Aucun espace bénéficiaire lié à ce compte." };
      const fId = String(args.formationId);
      const f = await prisma.formation.findFirst({ where: { id: fId, isPublic: true, status: "PUBLIE", deletedAt: null } });
      if (!f) return { textForLLM: "Formation introuvable ou non publique." };
      await prisma.formationInterest.upsert({ where: { beneficiaryId_formationId: { beneficiaryId: ben.id, formationId: fId } }, create: { beneficiaryId: ben.id, formationId: fId, status: "saved" }, update: {} });
      return { textForLLM: `Formation « ${f.title} » enregistrée dans vos favoris.`, custom: { name: "app.refresh", value: {} } };
    },
  },
  {
    name: "get_my_trainer_planning",
    description: "Retourne les prochaines interventions du formateur connecté.",
    input_schema: { type: "object", properties: {} },
    execute: async (ctx) => {
      const trainer = await prisma.trainer.findFirst({ where: { userId: ctx.userId, organizationId: ctx.organizationId } });
      if (!trainer) return { textForLLM: "Aucune fiche formateur liée à ce compte." };
      const now = new Date();
      const sessions = await prisma.session.findMany({ where: { trainerId: trainer.id, organizationId: ctx.organizationId, deletedAt: null, endDate: { gte: now } }, include: { formation: { select: { title: true } } }, orderBy: { startDate: "asc" }, take: 10 });
      return { textForLLM: JSON.stringify({ upcoming: sessions.map((s) => ({ formation: s.formation.title, start: s.startDate.toISOString(), status: s.status })) }) };
    },
  },
  {
    name: "platform_overview",
    description: "Indicateurs CONSOLIDÉS de toute la plateforme (cross-centres) : nombre de centres, formateurs, bénéficiaires, CA réseau. Réservé au super-admin plateforme.",
    input_schema: { type: "object", properties: {} },
    execute: async () => {
      const admin = await getPlatformAdmin();
      if (!admin) return { textForLLM: "Accès refusé : réservé au super-admin plateforme." };
      const o = await getPlatformOverview();
      const block: UIBlock = {
        type: "metric_grid", title: "Écosystème",
        metrics: [
          { label: "Centres", value: String(o.centers) },
          { label: "Formateurs", value: String(o.trainers) },
          { label: "Bénéficiaires", value: String(o.beneficiaries) },
          { label: "CA réseau", value: formatMoney(o.networkRevenue), tone: "positive" },
        ],
      };
      return { textForLLM: JSON.stringify(o), uiBlock: block };
    },
  },
];
