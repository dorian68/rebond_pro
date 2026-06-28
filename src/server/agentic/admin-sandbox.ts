import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform";
import { formatMoney } from "@/lib/utils";

export type SandboxSeverity = "ok" | "warning" | "critical";
export type SandboxAgentId =
  | "center_audit"
  | "documents_qualiopi"
  | "planning_optimizer"
  | "marketplace_readiness"
  | "pedagogical_designer"
  | "crm_next_actions"
  | "onboarding_center"
  | "finance_network";

export type SandboxFinding = {
  severity: SandboxSeverity;
  title: string;
  detail: string;
  evidence?: string[];
};

export type SandboxRecommendation = {
  title: string;
  rationale: string;
  suggestedNextStep: string;
};

export type SandboxAgentReport = {
  id: SandboxAgentId;
  name: string;
  scope: string;
  mode: "SANDBOX_READ_ONLY";
  verdict: SandboxSeverity;
  generatedAt: string;
  summary: string;
  metrics: { label: string; value: string; tone?: SandboxSeverity }[];
  findings: SandboxFinding[];
  recommendations: SandboxRecommendation[];
  guardrails: string[];
};

const SANDBOX_GUARDRAILS = [
  "Lecture cross-tenant réservée au super-admin plateforme.",
  "Aucune écriture Prisma, aucun envoi email, aucune génération de document.",
  "Les recommandations sont des simulations : elles ne modifient pas les données de production.",
  "Les centres et utilisateurs n'ont aucune route ni outil permettant de lancer ces agents.",
];

function verdict(findings: SandboxFinding[]): SandboxSeverity {
  if (findings.some((f) => f.severity === "critical")) return "critical";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  return "ok";
}

function metricTone(value: number, warnAt = 1): SandboxSeverity {
  return value >= warnAt ? "warning" : "ok";
}

const SANDBOX_AGENT_RUNNERS: { id: SandboxAgentId; name: string; run: () => Promise<SandboxAgentReport> }[] = [
  { id: "center_audit", name: "Agent Audit Centre", run: runCenterAuditAgent },
  { id: "documents_qualiopi", name: "Agent Documents & Qualiopi", run: runDocumentsQualiopiAgent },
  { id: "planning_optimizer", name: "Agent Planning", run: runPlanningOptimizerAgent },
  { id: "marketplace_readiness", name: "Agent Marketplace Readiness", run: runMarketplaceReadinessAgent },
  { id: "pedagogical_designer", name: "Agent Concepteur pédagogique", run: runPedagogicalDesignerAgent },
  { id: "crm_next_actions", name: "Agent CRM Next Actions", run: runCrmNextActionsAgent },
  { id: "onboarding_center", name: "Agent Onboarding Centre", run: runOnboardingCenterAgent },
  { id: "finance_network", name: "Agent Finance Réseau", run: runFinanceNetworkAgent },
];

/** Carte de repli si un agent échoue : un diagnostic indisponible ne doit pas faire planter la page. */
function sandboxErrorReport(id: SandboxAgentId, name: string, error: unknown): SandboxAgentReport {
  const message = (error instanceof Error ? error.message : String(error)).split("\n")[0].slice(0, 200);
  return {
    id,
    name,
    scope: "Diagnostic momentanément indisponible.",
    mode: "SANDBOX_READ_ONLY",
    verdict: "warning",
    generatedAt: new Date().toISOString(),
    summary: "Cet agent n'a pas pu produire son diagnostic (erreur de lecture des données). Les autres agents restent disponibles.",
    metrics: [],
    findings: [{ severity: "warning", title: "Agent indisponible", detail: message }],
    recommendations: [{ title: "Réessayer le diagnostic", rationale: "L'erreur peut être transitoire (connexion ou charge base de données).", suggestedNextStep: "Recharger la page ; si l'erreur persiste, vérifier la connectivité de la base." }],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

export async function runAdminSandboxAgents(): Promise<SandboxAgentReport[]> {
  await requirePlatformAdmin();
  // Exécution SÉQUENTIELLE + RÉSILIENTE : borne le nombre de connexions DB concurrentes
  // (8 agents × N requêtes en parallèle saturaient le pool) et isole les échecs — un agent
  // qui plante rend une carte « indisponible » au lieu de faire crasher toute la page.
  const reports: SandboxAgentReport[] = [];
  for (const agent of SANDBOX_AGENT_RUNNERS) {
    try {
      reports.push(await agent.run());
    } catch (error) {
      reports.push(sandboxErrorReport(agent.id, agent.name, error));
    }
  }
  return reports;
}

async function runCenterAuditAgent(): Promise<SandboxAgentReport> {
  const now = new Date();
  const [centers, pendingMarketplace, activeProspects, staleProspects, upcomingSessions] = await Promise.all([
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        plan: true,
        marketplaceStatus: true,
        publicProfileEnabled: true,
        publicEmail: true,
        publicPhone: true,
        _count: {
          select: {
            formations: { where: { deletedAt: null } },
            trainers: { where: { deletedAt: null, active: true } },
            prospects: { where: { deletedAt: null } },
          },
        },
        formations: {
          where: { deletedAt: null, isPublic: true, status: "PUBLIE" },
          select: { id: true },
          take: 1,
        },
        sessions: {
          where: { deletedAt: null, endDate: { gte: now }, status: { not: "ANNULEE" } },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.organization.count({
      where: {
        deletedAt: null,
        marketplaceStatus: { in: ["PENDING", "REJECTED"] },
        formations: { some: { deletedAt: null, isPublic: true, status: "PUBLIE" } },
      },
    }),
    prisma.prospect.count({ where: { deletedAt: null, stage: { notIn: ["GAGNE", "PERDU"] } } }),
    prisma.prospect.count({
      where: {
        deletedAt: null,
        stage: { notIn: ["GAGNE", "PERDU"] },
        OR: [{ nextFollowUpDate: { lt: now } }, { nextFollowUpDate: null }],
      },
    }),
    prisma.session.count({ where: { deletedAt: null, endDate: { gte: now }, status: { not: "ANNULEE" } } }),
  ]);

  const noPublicOffer = centers.filter((c) => c.formations.length === 0);
  const noTrainer = centers.filter((c) => c._count.trainers === 0);
  const noUpcomingSession = centers.filter((c) => c.sessions.length === 0 && c._count.formations > 0);
  const missingPublicContact = centers.filter((c) => c.publicProfileEnabled && !c.publicEmail && !c.publicPhone);

  const findings: SandboxFinding[] = [];
  if (pendingMarketplace > 0) findings.push({
    severity: "critical",
    title: "Centres en attente de validation marketplace",
    detail: `${pendingMarketplace} centre(s) ont au moins une formation publiable mais ne sont pas encore validés.`,
    evidence: centers.filter((c) => c.marketplaceStatus !== "APPROVED" && c.formations.length > 0).slice(0, 6).map((c) => c.name),
  });
  if (noPublicOffer.length > 0) findings.push({
    severity: "warning",
    title: "Centres sans offre publique",
    detail: `${noPublicOffer.length} centre(s) n'ont aucune formation publiée visible côté marketplace.`,
    evidence: noPublicOffer.slice(0, 6).map((c) => c.name),
  });
  if (noTrainer.length > 0) findings.push({
    severity: "warning",
    title: "Centres sans formateur actif",
    detail: `${noTrainer.length} centre(s) ne disposent d'aucun formateur actif.`,
    evidence: noTrainer.slice(0, 6).map((c) => c.name),
  });
  if (missingPublicContact.length > 0) findings.push({
    severity: "warning",
    title: "Profils publics sans contact",
    detail: `${missingPublicContact.length} profil(s) public(s) n'ont ni email ni téléphone public.`,
    evidence: missingPublicContact.slice(0, 6).map((c) => c.name),
  });
  if (noUpcomingSession.length > 0) findings.push({
    severity: "warning",
    title: "Centres avec catalogue mais sans session à venir",
    detail: `${noUpcomingSession.length} centre(s) ont des formations mais aucune session future active.`,
    evidence: noUpcomingSession.slice(0, 6).map((c) => c.name),
  });
  if (staleProspects > 0) findings.push({
    severity: "warning",
    title: "Prospects actifs sans prochaine relance claire",
    detail: `${staleProspects}/${activeProspects} prospect(s) actif(s) sont sans date de relance future.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "center_audit",
    name: "Agent Audit Centre",
    scope: "Écosystème centres, publication marketplace, CRM et activation",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Aucun blocage majeur détecté dans l'activation réseau."
      : "Des leviers d'activation réseau nécessitent une revue admin avant action humaine.",
    metrics: [
      { label: "Centres scannés", value: String(centers.length) },
      { label: "Validation marketplace", value: String(pendingMarketplace), tone: metricTone(pendingMarketplace) },
      { label: "Sans offre publique", value: String(noPublicOffer.length), tone: metricTone(noPublicOffer.length) },
      { label: "Sans formateur actif", value: String(noTrainer.length), tone: metricTone(noTrainer.length) },
      { label: "Sessions à venir", value: String(upcomingSessions) },
      { label: "Prospects à clarifier", value: String(staleProspects), tone: metricTone(staleProspects) },
    ],
    findings,
    recommendations: [
      {
        title: "Traiter d'abord les centres publiables non validés",
        rationale: "Ce sont les cas où le contenu existe déjà mais ne produit pas de visibilité marketplace.",
        suggestedNextStep: "Ouvrir /admin/centres et valider ou refuser explicitement les centres concernés.",
      },
      {
        title: "Prioriser les centres sans offre publique",
        rationale: "Un centre sans formation publiée ne contribue ni au catalogue ni au flux de leads.",
        suggestedNextStep: "Contacter les centres listés ou préparer un onboarding assisté par document.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runDocumentsQualiopiAgent(): Promise<SandboxAgentReport> {
  const [templates, sessions, documents] = await Promise.all([
    prisma.documentTemplate.findMany({
      where: { status: "ACTIVE" },
      select: { organizationId: true, type: true, variables: true, engine: true },
      take: 1000,
    }),
    prisma.session.findMany({
      where: { deletedAt: null, status: { not: "ANNULEE" } },
      select: {
        id: true,
        organization: { select: { name: true } },
        formation: { select: { title: true } },
        _count: { select: { enrollments: true, documents: true } },
      },
      take: 500,
    }),
    prisma.document.findMany({
      select: { status: true, completionStatus: true, completionScore: true, type: true, organizationId: true, sentAt: true },
      take: 2000,
    }),
  ]);

  const sessionsWithLearnersNoDocs = sessions.filter((s) => s._count.enrollments > 0 && s._count.documents === 0);
  const incompleteDocs = documents.filter((d) => d.completionStatus !== "COMPLETE" || d.completionScore < 80);
  const generatedNotSent = documents.filter((d) => d.status === "GENERE" && !d.sentAt);
  const orgTemplateCount = new Set(templates.filter((t) => t.organizationId).map((t) => `${t.organizationId}:${t.type}`)).size;
  const globalTemplateTypes = new Set(templates.filter((t) => !t.organizationId).map((t) => t.type)).size;
  const docTypesCovered = new Set(templates.map((t) => t.type)).size;

  const findings: SandboxFinding[] = [];
  if (sessionsWithLearnersNoDocs.length > 0) findings.push({
    severity: "critical",
    title: "Sessions avec inscrits mais sans document",
    detail: `${sessionsWithLearnersNoDocs.length} session(s) ont des inscrits mais aucun document généré.`,
    evidence: sessionsWithLearnersNoDocs.slice(0, 8).map((s) => `${s.organization.name} · ${s.formation.title}`),
  });
  if (incompleteDocs.length > 0) findings.push({
    severity: "warning",
    title: "Documents incomplets",
    detail: `${incompleteDocs.length} document(s) ont un statut de complétude insuffisant ou des variables manquantes.`,
  });
  if (generatedNotSent.length > 0) findings.push({
    severity: "warning",
    title: "Documents générés non envoyés",
    detail: `${generatedNotSent.length} document(s) générés n'ont pas encore été envoyés.`,
  });
  if (globalTemplateTypes < 5) findings.push({
    severity: "warning",
    title: "Socle global de modèles encore court",
    detail: `${globalTemplateTypes} type(s) de documents ont un modèle plateforme actif. Le socle Qualiopi peut être étoffé.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "documents_qualiopi",
    name: "Agent Documents & Qualiopi",
    scope: "Modèles, documents générés, complétude et risques administratifs",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Le socle documentaire ne montre pas de rupture évidente."
      : "Des écarts documentaires peuvent fragiliser le suivi administratif ou qualité.",
    metrics: [
      { label: "Sessions scannées", value: String(sessions.length) },
      { label: "Sessions sans documents", value: String(sessionsWithLearnersNoDocs.length), tone: metricTone(sessionsWithLearnersNoDocs.length) },
      { label: "Documents incomplets", value: String(incompleteDocs.length), tone: metricTone(incompleteDocs.length) },
      { label: "Générés non envoyés", value: String(generatedNotSent.length), tone: metricTone(generatedNotSent.length) },
      { label: "Types couverts", value: String(docTypesCovered) },
      { label: "Templates centre", value: String(orgTemplateCount) },
    ],
    findings,
    recommendations: [
      {
        title: "Créer une file de préflight documentaire avant chaque session",
        rationale: "La conformité se joue avant l'entrée en formation, pas seulement à la clôture.",
        suggestedNextStep: "Utiliser l'agent pour lister les documents manquants, puis générer manuellement depuis /documents.",
      },
      {
        title: "Compléter la bibliothèque globale",
        rationale: "Plus le socle global couvre de documents obligatoires, moins chaque centre doit repartir de zéro.",
        suggestedNextStep: "Ajouter les modèles prioritaires dans /admin/documents : convention, contrat, émargement, certificat de réalisation, attestation.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runPlanningOptimizerAgent(): Promise<SandboxAgentReport> {
  const now = new Date();
  const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const [sessions, unavailabilities, changeRequests] = await Promise.all([
    prisma.session.findMany({
      where: { deletedAt: null, endDate: { gte: now }, startDate: { lte: in45Days }, status: { not: "ANNULEE" } },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        slots: true,
        capacity: true,
        trainerId: true,
        roomId: true,
        trainerConfirmed: true,
        pricePerLearner: true,
        organization: { select: { name: true } },
        formation: { select: { title: true } },
        trainer: { select: { firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { startDate: "asc" },
      take: 500,
    }),
    prisma.trainerAvailability.findMany({
      where: { type: "INDISPONIBLE", date: { gte: now, lte: in45Days } },
      select: { trainerId: true, date: true, slot: true },
      take: 1000,
    }),
    prisma.changeRequest.count({ where: { status: "pending", createdAt: { gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) } } }),
  ]);

  const unavailabilityKeys = new Set(unavailabilities.map((u) => `${u.trainerId}:${u.date.toISOString().slice(0, 10)}:${u.slot}`));
  const missingTrainer = sessions.filter((s) => !s.trainerId);
  const unconfirmedTrainer = sessions.filter((s) => s.trainerId && !s.trainerConfirmed);
  const lowFill = sessions.filter((s) => s.capacity > 0 && s._count.enrollments / s.capacity < 0.35);
  const conflicts = sessions.filter((s) => {
    if (!s.trainerId) return false;
    const day = s.startDate.toISOString().slice(0, 10);
    return s.slots.some((slot) => unavailabilityKeys.has(`${s.trainerId}:${day}:${slot}`) || unavailabilityKeys.has(`${s.trainerId}:${day}:JOURNEE`));
  });
  const projectedRevenueAtRisk = lowFill.reduce((sum, s) => sum + Math.max(0, Math.ceil(s.capacity * 0.35) - s._count.enrollments) * s.pricePerLearner, 0);

  const findings: SandboxFinding[] = [];
  if (conflicts.length > 0) findings.push({
    severity: "critical",
    title: "Conflits potentiels avec indisponibilités formateur",
    detail: `${conflicts.length} session(s) semblent tomber sur une indisponibilité déclarée.`,
    evidence: conflicts.slice(0, 8).map((s) => `${s.organization.name} · ${s.formation.title} · ${s.trainer?.firstName ?? ""} ${s.trainer?.lastName ?? ""}`.trim()),
  });
  if (missingTrainer.length > 0) findings.push({
    severity: "critical",
    title: "Sessions sans formateur",
    detail: `${missingTrainer.length} session(s) à venir n'ont pas de formateur assigné.`,
    evidence: missingTrainer.slice(0, 8).map((s) => `${s.organization.name} · ${s.formation.title}`),
  });
  if (unconfirmedTrainer.length > 0) findings.push({
    severity: "warning",
    title: "Formateurs non confirmés",
    detail: `${unconfirmedTrainer.length} session(s) ont un formateur assigné mais non confirmé.`,
  });
  if (lowFill.length > 0) findings.push({
    severity: "warning",
    title: "Sessions à faible remplissage",
    detail: `${lowFill.length} session(s) à 45 jours sont sous 35% de remplissage.`,
    evidence: lowFill.slice(0, 8).map((s) => `${s.organization.name} · ${s.formation.title} · ${s._count.enrollments}/${s.capacity}`),
  });

  const reportVerdict = verdict(findings);
  return {
    id: "planning_optimizer",
    name: "Agent Planning",
    scope: "Sessions à venir, contraintes formateurs, remplissage et demandes de modification",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Le planning proche ne montre pas de conflit évident."
      : "Le planning proche contient des risques opérationnels à traiter manuellement.",
    metrics: [
      { label: "Sessions 45 jours", value: String(sessions.length) },
      { label: "Sans formateur", value: String(missingTrainer.length), tone: metricTone(missingTrainer.length) },
      { label: "Conflits détectés", value: String(conflicts.length), tone: metricTone(conflicts.length) },
      { label: "Non confirmées", value: String(unconfirmedTrainer.length), tone: metricTone(unconfirmedTrainer.length) },
      { label: "Faible remplissage", value: String(lowFill.length), tone: metricTone(lowFill.length) },
      { label: "Demandes formateur", value: String(changeRequests), tone: metricTone(changeRequests) },
      { label: "CA théorique à risque", value: formatMoney(projectedRevenueAtRisk), tone: metricTone(projectedRevenueAtRisk) },
    ],
    findings,
    recommendations: [
      {
        title: "Traiter les conflits avant l'optimisation commerciale",
        rationale: "Un conflit formateur bloque l'exécution réelle de la session, même si la session est vendable.",
        suggestedNextStep: "Ouvrir les sessions listées dans leur centre et reprogrammer ou réassigner après validation humaine.",
      },
      {
        title: "Créer une routine de confirmation formateur",
        rationale: "Les sessions non confirmées deviennent des risques de dernière minute.",
        suggestedNextStep: "Relancer les centres concernés ou demander aux formateurs de confirmer depuis leur portail.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runMarketplaceReadinessAgent(): Promise<SandboxAgentReport> {
  const formations = await prisma.formation.findMany({
    where: { deletedAt: null, isPublic: true, status: "PUBLIE" },
    select: {
      title: true,
      publicSlug: true,
      category: true,
      shortDescription: true,
      longDescription: true,
      durationHours: true,
      durationDays: true,
      price: true,
      coverImageUrl: true,
      organization: {
        select: {
          name: true,
          slug: true,
          marketplaceStatus: true,
          publicProfileEnabled: true,
          city: true,
          tagline: true,
          publicEmail: true,
          publicPhone: true,
          coverImageUrl: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const blockedByOrg = formations.filter((f) => f.organization.marketplaceStatus !== "APPROVED" || !f.organization.publicProfileEnabled);
  const missingSlug = formations.filter((f) => !f.publicSlug);
  const weakFormationContent = formations.filter((f) =>
    !f.category || !f.shortDescription || f.shortDescription.length < 45 || !f.longDescription || (!f.durationDays && !f.durationHours) || f.price <= 0,
  );
  const weakCenterProfile = formations.filter((f) =>
    !f.organization.city || !f.organization.tagline || (!f.organization.publicEmail && !f.organization.publicPhone) || (!f.organization.logoUrl && !f.organization.coverImageUrl),
  );
  const missingVisual = formations.filter((f) => !f.coverImageUrl);

  const findings: SandboxFinding[] = [];
  if (blockedByOrg.length > 0) findings.push({
    severity: "critical",
    title: "Formations publiées bloquées par le statut centre",
    detail: `${blockedByOrg.length} formation(s) publiées ne peuvent pas produire de visibilité car le centre n'est pas validé ou le profil public est désactivé.`,
    evidence: blockedByOrg.slice(0, 8).map((f) => `${f.organization.name} · ${f.title}`),
  });
  if (missingSlug.length > 0) findings.push({
    severity: "critical",
    title: "Formations publiées sans URL publique",
    detail: `${missingSlug.length} formation(s) publiées n'ont pas de publicSlug exploitable.`,
    evidence: missingSlug.slice(0, 8).map((f) => `${f.organization.name} · ${f.title}`),
  });
  if (weakFormationContent.length > 0) findings.push({
    severity: "warning",
    title: "Fiches formation commercialement faibles",
    detail: `${weakFormationContent.length} formation(s) manquent de catégorie, description, durée ou prix.`,
    evidence: weakFormationContent.slice(0, 8).map((f) => `${f.organization.name} · ${f.title}`),
  });
  if (weakCenterProfile.length > 0) findings.push({
    severity: "warning",
    title: "Profils centre incomplets",
    detail: `${weakCenterProfile.length} fiche(s) formation pointent vers un centre dont le profil public manque d'éléments de confiance.`,
  });
  if (missingVisual.length > 0) findings.push({
    severity: "warning",
    title: "Formations sans visuel marketplace",
    detail: `${missingVisual.length} formation(s) publiées n'ont pas de couverture dédiée.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "marketplace_readiness",
    name: "Agent Marketplace Readiness",
    scope: "Visibilité marketplace, pages publiques, qualité commerciale des fiches",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Les formations publiées semblent alignées avec les règles de visibilité marketplace."
      : "Certaines fiches publiées ne maximisent pas la visibilité ou la conversion marketplace.",
    metrics: [
      { label: "Formations publiées", value: String(formations.length) },
      { label: "Bloquées centre", value: String(blockedByOrg.length), tone: metricTone(blockedByOrg.length) },
      { label: "Sans URL publique", value: String(missingSlug.length), tone: metricTone(missingSlug.length) },
      { label: "Contenu faible", value: String(weakFormationContent.length), tone: metricTone(weakFormationContent.length) },
      { label: "Profil centre faible", value: String(weakCenterProfile.length), tone: metricTone(weakCenterProfile.length) },
      { label: "Sans visuel", value: String(missingVisual.length), tone: metricTone(missingVisual.length) },
    ],
    findings,
    recommendations: [
      {
        title: "Séparer les blocages techniques des faiblesses commerciales",
        rationale: "Un centre non validé ou une URL manquante bloque l'affichage ; une fiche faible réduit seulement la conversion.",
        suggestedNextStep: "Traiter d'abord les formations bloquées, puis enrichir les fiches faibles.",
      },
      {
        title: "Créer un score de publication marketplace",
        rationale: "Un score explicite aiderait l'admin à prioriser les fiches visibles mais peu convaincantes.",
        suggestedNextStep: "Utiliser ces constats pour définir un score qualité formation/centre.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runPedagogicalDesignerAgent(): Promise<SandboxAgentReport> {
  const formations = await prisma.formation.findMany({
    where: { deletedAt: null },
    select: {
      title: true,
      status: true,
      objectives: true,
      targetAudience: true,
      prerequisites: true,
      program: true,
      durationHours: true,
      durationDays: true,
      level: true,
      modality: true,
      organization: { select: { name: true } },
      _count: { select: { eligibleTrainers: true, sessions: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const noProgram = formations.filter((f) => !f.program || f.program.length < 120);
  const noObjectives = formations.filter((f) => !f.objectives || f.objectives.length < 40);
  const noAudience = formations.filter((f) => !f.targetAudience);
  const noDuration = formations.filter((f) => !f.durationDays && !f.durationHours);
  const noEligibleTrainer = formations.filter((f) => f._count.eligibleTrainers === 0);
  const publishedIncomplete = formations.filter((f) =>
    f.status === "PUBLIE" && (!f.program || !f.objectives || !f.targetAudience || (!f.durationDays && !f.durationHours)),
  );

  const findings: SandboxFinding[] = [];
  if (publishedIncomplete.length > 0) findings.push({
    severity: "critical",
    title: "Formations publiées pédagogiquement incomplètes",
    detail: `${publishedIncomplete.length} formation(s) publiées manquent d'objectifs, programme, public ou durée.`,
    evidence: publishedIncomplete.slice(0, 8).map((f) => `${f.organization.name} · ${f.title}`),
  });
  if (noProgram.length > 0) findings.push({
    severity: "warning",
    title: "Programmes trop faibles ou absents",
    detail: `${noProgram.length} formation(s) ont un programme absent ou trop court pour inspirer confiance.`,
  });
  if (noObjectives.length > 0) findings.push({
    severity: "warning",
    title: "Objectifs pédagogiques insuffisants",
    detail: `${noObjectives.length} formation(s) n'explicitent pas assez les compétences visées.`,
  });
  if (noAudience.length > 0) findings.push({
    severity: "warning",
    title: "Public cible manquant",
    detail: `${noAudience.length} formation(s) ne précisent pas le public visé.`,
  });
  if (noDuration.length > 0) findings.push({
    severity: "warning",
    title: "Durée manquante",
    detail: `${noDuration.length} formation(s) n'ont ni durée en jours ni durée en heures.`,
  });
  if (noEligibleTrainer.length > 0) findings.push({
    severity: "warning",
    title: "Aucun formateur éligible lié",
    detail: `${noEligibleTrainer.length} formation(s) ne sont rattachées à aucun formateur éligible.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "pedagogical_designer",
    name: "Agent Concepteur pédagogique",
    scope: "Qualité pédagogique des formations, complétude programme/objectifs/public/durée",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Les formations scannées disposent d'un socle pédagogique exploitable."
      : "Des formations gagneraient à être reconstruites ou enrichies avant publication ou vente.",
    metrics: [
      { label: "Formations scannées", value: String(formations.length) },
      { label: "Publiées incomplètes", value: String(publishedIncomplete.length), tone: metricTone(publishedIncomplete.length) },
      { label: "Programme faible", value: String(noProgram.length), tone: metricTone(noProgram.length) },
      { label: "Objectifs faibles", value: String(noObjectives.length), tone: metricTone(noObjectives.length) },
      { label: "Public absent", value: String(noAudience.length), tone: metricTone(noAudience.length) },
      { label: "Sans formateur lié", value: String(noEligibleTrainer.length), tone: metricTone(noEligibleTrainer.length) },
    ],
    findings,
    recommendations: [
      {
        title: "Faire précéder la publication par un préflight pédagogique",
        rationale: "Une formation peut être techniquement publiée mais pédagogiquement trop faible pour vendre ou soutenir Qualiopi.",
        suggestedNextStep: "Utiliser Socrate côté centre pour préremplir ou enrichir les champs pédagogiques, puis validation humaine.",
      },
      {
        title: "Lier les formations aux formateurs éligibles",
        rationale: "Le lien formation-formateur rend le planning et l'argumentaire public plus crédibles.",
        suggestedNextStep: "Demander aux centres listés d'associer leurs formateurs aux formations concernées.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runCrmNextActionsAgent(): Promise<SandboxAgentReport> {
  const now = new Date();
  const staleDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const prospects = await prisma.prospect.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      stage: true,
      isHot: true,
      potentialAmount: true,
      nextAction: true,
      nextFollowUpDate: true,
      updatedAt: true,
      organization: { select: { name: true } },
      activities: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const active = prospects.filter((p) => !["GAGNE", "PERDU"].includes(p.stage));
  const overdue = active.filter((p) => p.nextFollowUpDate && p.nextFollowUpDate < now);
  const noNextAction = active.filter((p) => !p.nextAction && !p.nextFollowUpDate);
  const hotUnplanned = active.filter((p) => p.isHot && !p.nextFollowUpDate);
  const highValueDormant = active.filter((p) =>
    p.potentialAmount >= 100000 && p.updatedAt < staleDate && (p.activities[0]?.createdAt ?? p.updatedAt) < staleDate,
  );
  const pipelineAmount = active.reduce((sum, p) => sum + p.potentialAmount, 0);

  const findings: SandboxFinding[] = [];
  if (hotUnplanned.length > 0) findings.push({
    severity: "critical",
    title: "Prospects chauds sans relance planifiée",
    detail: `${hotUnplanned.length} prospect(s) chaud(s) n'ont pas de prochaine relance.`,
    evidence: hotUnplanned.slice(0, 8).map((p) => `${p.organization.name} · ${p.name}`),
  });
  if (overdue.length > 0) findings.push({
    severity: "warning",
    title: "Relances dépassées",
    detail: `${overdue.length} prospect(s) ont une date de relance dépassée.`,
    evidence: overdue.slice(0, 8).map((p) => `${p.organization.name} · ${p.name}`),
  });
  if (noNextAction.length > 0) findings.push({
    severity: "warning",
    title: "Prospects sans prochaine action",
    detail: `${noNextAction.length} prospect(s) actif(s) n'ont ni prochaine action ni date de suivi.`,
  });
  if (highValueDormant.length > 0) findings.push({
    severity: "warning",
    title: "Opportunités significatives dormantes",
    detail: `${highValueDormant.length} prospect(s) à potentiel élevé n'ont pas bougé depuis 14 jours.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "crm_next_actions",
    name: "Agent CRM Next Actions",
    scope: "Pipeline commercial, relances, prospects chauds et opportunités dormantes",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Le pipeline actif semble avoir des prochaines actions suffisamment claires."
      : "Le pipeline contient des relances ou opportunités qui risquent de se perdre.",
    metrics: [
      { label: "Prospects actifs", value: String(active.length) },
      { label: "Pipeline estimé", value: formatMoney(pipelineAmount) },
      { label: "Chaud sans relance", value: String(hotUnplanned.length), tone: metricTone(hotUnplanned.length) },
      { label: "Relances dépassées", value: String(overdue.length), tone: metricTone(overdue.length) },
      { label: "Sans prochaine action", value: String(noNextAction.length), tone: metricTone(noNextAction.length) },
      { label: "Dormants > 1k€", value: String(highValueDormant.length), tone: metricTone(highValueDormant.length) },
    ],
    findings,
    recommendations: [
      {
        title: "Transformer le diagnostic en file de relance",
        rationale: "Les prospects chauds sans prochaine action sont le meilleur levier court terme.",
        suggestedNextStep: "Demander aux centres concernés de planifier une relance ou de déplacer l'étape du pipeline.",
      },
      {
        title: "Créer un rituel hebdomadaire CRM",
        rationale: "Une revue automatique évite que les opportunités à forte valeur vieillissent sans action.",
        suggestedNextStep: "Utiliser cet agent chaque semaine depuis l'admin puis contacter les centres à risque.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runOnboardingCenterAgent(): Promise<SandboxAgentReport> {
  const now = new Date();
  const centers = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: {
      name: true,
      createdAt: true,
      plan: true,
      billingStatus: true,
      trialEndsAt: true,
      nbFormationsDeclarees: true,
      nbFormateursDeclares: true,
      nbSessionsMois: true,
      objectifPrincipal: true,
      publicEmail: true,
      publicPhone: true,
      legalName: true,
      legalAddress: true,
      nda: true,
      _count: {
        select: {
          formations: { where: { deletedAt: null } },
          trainers: { where: { deletedAt: null } },
          sessions: { where: { deletedAt: null } },
          prospects: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const emptyCenters = centers.filter((c) => c._count.formations === 0 && c._count.trainers === 0 && c._count.sessions === 0 && c._count.prospects === 0);
  const missingOnboardingFields = centers.filter((c) => c.nbFormationsDeclarees == null || c.nbFormateursDeclares == null || c.nbSessionsMois == null || !c.objectifPrincipal);
  const missingLegalForDocs = centers.filter((c) => !c.legalName || !c.legalAddress || !c.nda);
  const expiredTrial = centers.filter((c) => c.billingStatus === "trial" && c.trialEndsAt && c.trialEndsAt < now);
  const noContact = centers.filter((c) => !c.publicEmail && !c.publicPhone);
  const recentEmpty = emptyCenters.filter((c) => c.createdAt > new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000));

  const findings: SandboxFinding[] = [];
  if (expiredTrial.length > 0) findings.push({
    severity: "critical",
    title: "Trials expirés encore en statut trial",
    detail: `${expiredTrial.length} centre(s) ont une période d'essai expirée mais restent marqués trial.`,
    evidence: expiredTrial.slice(0, 8).map((c) => c.name),
  });
  if (recentEmpty.length > 0) findings.push({
    severity: "warning",
    title: "Nouveaux centres sans activation initiale",
    detail: `${recentEmpty.length} centre(s) récents n'ont encore aucune formation, formateur, session ou prospect.`,
    evidence: recentEmpty.slice(0, 8).map((c) => c.name),
  });
  if (missingOnboardingFields.length > 0) findings.push({
    severity: "warning",
    title: "Onboarding déclaratif incomplet",
    detail: `${missingOnboardingFields.length} centre(s) n'ont pas renseigné tous les repères initiaux.`,
  });
  if (missingLegalForDocs.length > 0) findings.push({
    severity: "warning",
    title: "Données légales insuffisantes pour les documents",
    detail: `${missingLegalForDocs.length} centre(s) risquent des documents incomplets faute de nom légal, adresse ou NDA.`,
  });
  if (noContact.length > 0) findings.push({
    severity: "warning",
    title: "Centres sans contact public",
    detail: `${noContact.length} centre(s) n'ont ni email ni téléphone public.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "onboarding_center",
    name: "Agent Onboarding Centre",
    scope: "Activation des nouveaux centres, complétude onboarding, données légales et trial",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Les centres ont un socle d'activation/onboarding cohérent."
      : "Certains centres peuvent rester bloqués avant de produire de la valeur réseau.",
    metrics: [
      { label: "Centres scannés", value: String(centers.length) },
      { label: "Centres vides", value: String(emptyCenters.length), tone: metricTone(emptyCenters.length) },
      { label: "Récents vides", value: String(recentEmpty.length), tone: metricTone(recentEmpty.length) },
      { label: "Onboarding incomplet", value: String(missingOnboardingFields.length), tone: metricTone(missingOnboardingFields.length) },
      { label: "Légal incomplet", value: String(missingLegalForDocs.length), tone: metricTone(missingLegalForDocs.length) },
      { label: "Trials expirés", value: String(expiredTrial.length), tone: metricTone(expiredTrial.length) },
    ],
    findings,
    recommendations: [
      {
        title: "Créer un parcours de rattrapage onboarding",
        rationale: "Un centre vide après inscription ne peut pas tester la valeur du produit.",
        suggestedNextStep: "Contacter les centres récents vides et leur proposer l'import document pour créer formation/formateur/session.",
      },
      {
        title: "Bloquer la génération documentaire si les données légales sont absentes",
        rationale: "Les documents officiels dépendent de ces champs et peuvent devenir incomplets.",
        suggestedNextStep: "Afficher ces données comme prérequis dans Paramètres ou Documents côté centre.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}

async function runFinanceNetworkAgent(): Promise<SandboxAgentReport> {
  const [transactions, centers] = await Promise.all([
    prisma.transaction.findMany({
      select: {
        type: true,
        amount: true,
        commission: true,
        status: true,
        payoutStatus: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.organization.findMany({
      where: { deletedAt: null },
      select: { name: true, plan: true, billingStatus: true, stripeCustomerId: true, _count: { select: { transactions: true } } },
      take: 500,
    }),
  ]);

  const paid = transactions.filter((t) => t.status === "paid");
  const failedOrPending = transactions.filter((t) => t.status !== "paid");
  const pendingPayouts = paid.filter((t) => t.type === "FORMATION_PURCHASE" && t.payoutStatus === "pending");
  const anomalousPayouts = paid.filter((t) => t.type !== "FORMATION_PURCHASE" && t.payoutStatus === "pending");
  const paidPlansWithoutStripe = centers.filter((c) => c.plan !== "FREE" && !c.stripeCustomerId);
  const paidCentersNoTx = centers.filter((c) => c.plan !== "FREE" && c._count.transactions === 0);
  const gross = paid.reduce((sum, t) => sum + t.amount, 0);
  const commission = paid.reduce((sum, t) => sum + t.commission, 0);
  const pendingNet = pendingPayouts.reduce((sum, t) => sum + Math.max(0, t.amount - t.commission), 0);

  const findings: SandboxFinding[] = [];
  if (anomalousPayouts.length > 0) findings.push({
    severity: "critical",
    title: "Payout pending sur transaction non formation",
    detail: `${anomalousPayouts.length} transaction(s) hors achat formation ont un payout pending alors qu'elles devraient être non applicables.`,
    evidence: anomalousPayouts.slice(0, 8).map((t) => `${t.organization.name} · ${t.type}`),
  });
  if (paidPlansWithoutStripe.length > 0) findings.push({
    severity: "warning",
    title: "Centres payants sans client Stripe",
    detail: `${paidPlansWithoutStripe.length} centre(s) en plan payant n'ont pas de stripeCustomerId.`,
    evidence: paidPlansWithoutStripe.slice(0, 8).map((c) => c.name),
  });
  if (paidCentersNoTx.length > 0) findings.push({
    severity: "warning",
    title: "Centres payants sans transaction ledger",
    detail: `${paidCentersNoTx.length} centre(s) payants n'ont aucune transaction associée.`,
  });
  if (pendingPayouts.length > 0) findings.push({
    severity: "warning",
    title: "Reversements centres en attente",
    detail: `${pendingPayouts.length} achat(s) formation ont un net à reverser au centre.`,
  });
  if (failedOrPending.length > 0) findings.push({
    severity: "warning",
    title: "Transactions non payées",
    detail: `${failedOrPending.length} transaction(s) ne sont pas au statut paid.`,
  });

  const reportVerdict = verdict(findings);
  return {
    id: "finance_network",
    name: "Agent Finance Réseau",
    scope: "Ledger transactions, commissions, reversements et cohérence abonnement",
    mode: "SANDBOX_READ_ONLY",
    verdict: reportVerdict,
    generatedAt: new Date().toISOString(),
    summary: reportVerdict === "ok"
      ? "Le ledger financier ne montre pas d'anomalie évidente."
      : "Des points financiers méritent une revue admin avant clôture ou reversement.",
    metrics: [
      { label: "Transactions payées", value: String(paid.length) },
      { label: "Volume brut", value: formatMoney(gross) },
      { label: "Commission", value: formatMoney(commission) },
      { label: "Net à reverser", value: formatMoney(pendingNet), tone: metricTone(pendingNet) },
      { label: "Payouts en attente", value: String(pendingPayouts.length), tone: metricTone(pendingPayouts.length) },
      { label: "Anomalies payout", value: String(anomalousPayouts.length), tone: metricTone(anomalousPayouts.length) },
    ],
    findings,
    recommendations: [
      {
        title: "Revoir les reversements en attente depuis /admin/finances",
        rationale: "Les achats formation créent un net dû au centre tant que le payout n'est pas marqué settled.",
        suggestedNextStep: "Filtrer mentalement les transactions pending et les solder uniquement après vérification bancaire.",
      },
      {
        title: "Réconcilier les plans payants avec Stripe",
        rationale: "Un plan payant sans client Stripe ou sans ledger peut indiquer une donnée historique ou une configuration incomplète.",
        suggestedNextStep: "Comparer les centres listés avec Stripe avant toute correction manuelle.",
      },
    ],
    guardrails: SANDBOX_GUARDRAILS,
  };
}
