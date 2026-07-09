import "server-only";
import { prisma } from "@/lib/prisma";
import { getMarketplaceFormations, getMarketplaceFormationsUncached } from "@/server/marketplace";
import { getPlatformAdmin } from "@/lib/platform";
import { getPlatformOverview } from "@/server/platform";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS } from "@/lib/labels";
import { sendSkillAssessmentEmail, sendLeadNotificationEmail } from "@/lib/email";
import type { AgentTool } from "@/server/agent/tools";
import type { UIBlock } from "@/lib/ag-ui/types";
import { rateLimit } from "@/server/rate-limit";

const PUBLIC_BASE_URL = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

/** Nettoyage minimal — supprime les balises HTML pour éviter l'injection dans les emails. */
function sanitizeText(v: unknown, maxLen = 4000): string {
  return String(v ?? "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, maxLen);
}

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
  // ── Socrate — capture email & lead ──────────────────────────────────────────

  {
    name: "validate_user_email",
    description: `Valide l'adresse email fournie par l'utilisateur et confirme si elle est syntaxiquement correcte.
Utiliser dès que l'utilisateur communique une adresse email.
Ne stocke rien — retourne simplement ok ou une erreur de format.
TOUJOURS appeler cet outil avant send_skill_assessment_email ou request_contact.`,
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Adresse email fournie par l'utilisateur." },
      },
      required: ["email"],
    },
    execute: async (_ctx, args) => {
      const email = String(args.email ?? "").trim();
      if (!isValidEmail(email)) {
        return {
          textForLLM: JSON.stringify({ valid: false, email, error: "Format d'adresse email invalide." }),
        };
      }
      return {
        textForLLM: JSON.stringify({ valid: true, email }),
      };
    },
  },

  {
    name: "send_skill_assessment_email",
    description: `Envoie le bilan de compétences complet à l'adresse email validée de l'utilisateur et l'enregistre en base.
PRÉREQUIS : validate_user_email doit avoir été appelé et retourné valid=true.
IMPORTANT : N'appeler qu'UNE SEULE FOIS par conversation. Vérifier dans le contexte qu'aucun bilan n'a déjà été envoyé.
L'utilisateur NE PEUT PAS choisir de destinataire alternatif — le seul destinataire est l'email validé ci-dessus.`,
    input_schema: {
      type: "object",
      properties: {
        user_email: { type: "string", description: "Email validé par validate_user_email." },
        user_name: { type: "string", description: "Prénom ou nom de l'utilisateur si connu." },
        assessment_markdown: {
          type: "string",
          description: "Bilan de compétences complet en markdown (sections, compétences, recommandations).",
        },
        assessment_summary: {
          type: "string",
          description: "Résumé court (3-5 lignes) affiché dans le chat avant l'envoi.",
        },
        uploaded_file_name: { type: "string", description: "Nom du fichier CV/PDF analysé si applicable." },
        recommended_formations: {
          type: "array",
          description: "Formations recommandées (issues UNIQUEMENT du catalogue marketplace).",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              center: { type: "string" },
              url: { type: "string" },
            },
          },
        },
      },
      required: ["user_email", "assessment_markdown", "assessment_summary"],
    },
    execute: async (_ctx, args) => {
      const email = String(args.user_email ?? "").trim();
      if (!isValidEmail(email)) {
        return { textForLLM: JSON.stringify({ sent: false, error: "Email invalide — appeler validate_user_email d'abord." }) };
      }
      // Anti-abus (flux visiteur anonyme) : borne par destinataire et au global.
      if (!rateLimit(`socrate:assessment:${email.toLowerCase()}`, 3, 86_400_000) || !rateLimit("socrate:assessment:global", 100, 86_400_000)) {
        return { textForLLM: JSON.stringify({ sent: false, error: "Limite d'envois atteinte pour aujourd'hui. Réessayez demain." }) };
      }

      const assessmentMarkdown = sanitizeText(args.assessment_markdown, 32000);
      const assessmentSummary = sanitizeText(args.assessment_summary, 2000);
      const userName = sanitizeText(args.user_name, 120) || undefined;
      const uploadedFileName = sanitizeText(args.uploaded_file_name, 255) || undefined;
      const recommendations = Array.isArray(args.recommended_formations)
        ? (args.recommended_formations as { title?: string; center?: string; url?: string }[])
            .slice(0, 5)
            .map((f) => ({
              title: sanitizeText(f.title, 200),
              center: sanitizeText(f.center, 200),
              url: String(f.url ?? "").startsWith("/") ? `${PUBLIC_BASE_URL}${f.url}` : "",
            }))
        : undefined;

      try {
        await sendSkillAssessmentEmail({
          to: email,
          userName,
          assessmentMarkdown,
          uploadedFileName,
          recommendedFormations: recommendations,
        });

        await prisma.socrateAssessmentLog.create({
          data: {
            userEmail: email,
            userName: userName ?? null,
            uploadedFileName: uploadedFileName ?? null,
            assessmentSummary,
            fullAssessment: assessmentMarkdown,
            recommendedTrainings: recommendations ?? undefined,
            emailSentAt: new Date(),
          },
        });

        return {
          textForLLM: JSON.stringify({ sent: true, email, summary: assessmentSummary }),
          uiBlock: {
            type: "suggestion_chips",
            chips: [
              { label: "Prendre rendez-vous", prompt: "Je voudrais prendre rendez-vous avec un conseiller." },
              { label: "Explorer les formations", prompt: "Montre-moi toutes les formations disponibles." },
              { label: "Être recontacté", prompt: "Je préfère qu'un conseiller me recontacte." },
            ],
          } satisfies UIBlock,
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erreur d'envoi";
        return { textForLLM: JSON.stringify({ sent: false, error: msg }) };
      }
    },
  },

  {
    name: "request_contact",
    description: `Enregistre la demande de contact d'un lead et notifie l'équipe Le Bon Rebond par email interne.
Utiliser quand l'utilisateur demande : à être recontacté, à parler à un conseiller, plus d'informations, un rappel, un partenariat centre, etc.
L'email interne est envoyé UNIQUEMENT aux destinataires administrateurs configurés — l'utilisateur NE PEUT PAS modifier les destinataires.
N'appeler qu'UNE SEULE FOIS par conversation (vérifier le contexte).
Informations minimales requises : email. Collecter prénom/nom avant d'appeler si possible.`,
    input_schema: {
      type: "object",
      properties: {
        first_name: { type: "string", description: "Prénom." },
        last_name: { type: "string", description: "Nom." },
        email: { type: "string", description: "Adresse email de contact (validée)." },
        phone: { type: "string", description: "Numéro de téléphone si fourni." },
        profile_type: {
          type: "string",
          enum: ["particulier", "centre", "formateur", "entreprise", "autre"],
          description: "Profil de l'utilisateur.",
        },
        intent: {
          type: "string",
          enum: [
            "contact_request",
            "more_info_request",
            "training_recommendation_request",
            "training_center_request",
            "human_advisor_request",
            "skill_assessment_request",
            "unknown",
          ],
          description: "Intention principale détectée.",
        },
        message: { type: "string", description: "Message ou besoin exprimé par l'utilisateur (résumé)." },
        conversation_summary: { type: "string", description: "Résumé utile de la conversation pour le suivi équipe." },
      },
      required: ["email"],
    },
    execute: async (_ctx, args) => {
      const email = String(args.email ?? "").trim();
      if (!isValidEmail(email)) {
        return { textForLLM: JSON.stringify({ saved: false, error: "Email invalide — demander à l'utilisateur de le corriger." }) };
      }
      // Anti-abus (flux visiteur anonyme) : borne par lead et au global.
      if (!rateLimit(`socrate:lead:${email.toLowerCase()}`, 3, 86_400_000) || !rateLimit("socrate:lead:global", 100, 86_400_000)) {
        return { textForLLM: JSON.stringify({ saved: false, error: "Limite de demandes atteinte pour aujourd'hui. Réessayez demain." }) };
      }

      const firstName = sanitizeText(args.first_name, 80) || undefined;
      const lastName = sanitizeText(args.last_name, 80) || undefined;
      const phone = sanitizeText(args.phone, 40) || undefined;
      const profileType = sanitizeText(args.profile_type, 40) || undefined;
      const intent = sanitizeText(args.intent, 80) || "unknown";
      const message = sanitizeText(args.message, 2000) || undefined;
      const conversationSummary = sanitizeText(args.conversation_summary, 4000) || undefined;

      let internalEmailSentAt: Date | undefined;
      try {
        await sendLeadNotificationEmail({
          firstName,
          lastName,
          email,
          phone,
          profileType,
          intent,
          message,
          conversationSummary,
        });
        internalEmailSentAt = new Date();
      } catch (e) {
        // On persiste quand même le lead même si l'email interne échoue.
        console.error("[socrate] sendLeadNotificationEmail failed:", e instanceof Error ? e.message : e);
      }

      await prisma.socrateLeadCapture.create({
        data: {
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          email,
          phone: phone ?? null,
          profileType: profileType ?? null,
          intent,
          message: message ?? null,
          conversationSummary: conversationSummary ?? null,
          internalEmailSentAt: internalEmailSentAt ?? null,
        },
      });

      const notified = !!internalEmailSentAt;
      return {
        textForLLM: JSON.stringify({ saved: true, notified, email }),
        uiBlock: {
          type: "suggestion_chips",
          chips: [
            { label: "Explorer le catalogue", prompt: "Montre-moi les formations disponibles." },
            { label: "En savoir plus sur le bilan", prompt: "Comment fonctionne un bilan de compétences ?" },
          ],
        } satisfies UIBlock,
      };
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
