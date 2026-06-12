import "server-only";
import { prisma } from "@/lib/prisma";
import { getMarketplaceFormations, getMarketplaceFormationsUncached } from "@/server/marketplace";
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
    name: "micro_competency_assessment",
    description: `Outil de micro-bilan de compétences. Analyse le profil professionnel de l'utilisateur et retourne les formations pertinentes de la marketplace pour permettre des recommandations ciblées. Déclencher dès que l'utilisateur évoque : reconversion, bilan de compétences, chercher une formation, changer de métier, analyse de CV, offre d'emploi, compétences transférables, orientation professionnelle, montée en compétences, ou qu'il a partagé un document (CV, fiche de poste, diplôme).`,
    input_schema: {
      type: "object",
      properties: {
        profile_summary: { type: "string", description: "Résumé du profil (expériences, compétences, formation initiale, objectifs) extrait de la conversation et/ou des documents analysés." },
        target_jobs: { type: "array", items: { type: "string" }, description: "Métiers ou secteurs cibles identifiés, si exprimés." },
        constraints: { type: "string", description: "Contraintes (géo, budget CPF, durée, disponibilités) si exprimées." },
        search_query: { type: "string", description: "Mots-clés optionnels pour filtrer le catalogue (domaine, compétence, outil)." },
      },
      required: ["profile_summary"],
    },
    execute: async (_ctx, args) => {
      const query = String(args.search_query ?? "").trim() || undefined;
      // Récupère les formations marketplace (bypass cache pour avoir la liste fraîche)
      const formations = await getMarketplaceFormationsUncached({ q: query });
      const ids = formations.slice(0, 40).map((f) => f.id);
      // Enrichit avec les champs pédagogiques non inclus dans la sélection marketplace
      const details = await prisma.formation.findMany({
        where: { id: { in: ids } },
        select: { id: true, objectives: true, prerequisites: true, targetAudience: true },
      });
      const detailsMap = new Map(details.map((d) => [d.id, d]));

      const rich = formations.slice(0, 40).map((f) => {
        const d = detailsMap.get(f.id);
        return {
          id: f.id,
          title: f.title,
          center: f.organization.name,
          centerCity: f.organization.city,
          url: `/${f.organization.slug}/f/${f.publicSlug ?? f.slug}`,
          category: f.category ?? null,
          shortDescription: f.shortDescription ?? null,
          objectives: d?.objectives ?? null,
          targetAudience: d?.targetAudience ?? null,
          prerequisites: d?.prerequisites ?? null,
          durationHours: f.durationHours ?? null,
          durationDays: f.durationDays ?? null,
          price: f.price ? `${Math.round(f.price / 100)} €` : "Nous consulter",
          modality: MODALITY_LABELS[f.modality],
          level: LEVEL_LABELS[f.level],
        };
      });

      const text = `MICRO-BILAN DE COMPÉTENCES — DONNÉES DISPONIBLES

PROFIL ANALYSÉ :
${args.profile_summary}
${Array.isArray(args.target_jobs) && (args.target_jobs as string[]).length ? `\nMÉTIERS CIBLES EXPRIMÉS : ${(args.target_jobs as string[]).join(", ")}` : ""}
${args.constraints ? `\nCONTRAINTES : ${args.constraints}` : ""}

CATALOGUE MARKETPLACE (${rich.length} formations disponibles) :
${JSON.stringify(rich)}

INSTRUCTIONS POUR LA RÉPONSE :
Produis un micro-bilan structuré en markdown avec ces sections :
1. **Situation actuelle** (synthèse du profil)
2. **Compétences fortes** (identifiées ou déduites)
3. **Compétences transférables** (applicables au projet)
4. **Compétences à renforcer** (écarts par rapport à l'objectif)
5. **Pistes métier cohérentes**
6. **Formations recommandées** (3 à 5 maximum, UNIQUEMENT parmi les formations listées ci-dessus)
   - Pour chaque formation : titre, centre, score de pertinence (0-100), justification (+/-), lien CTA
7. **Prochaine action concrète**

GARDE-FOUS OBLIGATOIRES :
- N'invente AUCUNE formation absente du catalogue ci-dessus.
- Ne promets pas d'emploi garanti ("cette piste semble cohérente" et non "vous aurez un emploi").
- Reste pédagogique, bienveillant et réaliste.
- Si le catalogue est vide ou peu pertinent, dis-le franchement et oriente vers la page Contact.`;

      const block: UIBlock = {
        type: "suggestion_chips",
        chips: [
          { label: "Voir toutes les formations", prompt: "Montre-moi toutes les formations disponibles dans le catalogue." },
          { label: "Prendre rendez-vous", prompt: "Comment puis-je prendre rendez-vous pour un bilan de compétences ?" },
        ],
      };
      return { textForLLM: text, uiBlock: block };
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
