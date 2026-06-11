"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import { generateText, chat, logAi, isAiEnabled } from "@/lib/ai";
import { getDashboardMetrics } from "@/server/metrics";
import { formatMoney, formatDateRange } from "@/lib/utils";

const ORG_VOICE = "Tu écris en français, ton professionnel, chaleureux et concret, pour un centre de formation B2B. Pas de bla-bla, pas d'emoji excessif.";

export type AiText = { text: string; source: "ai" | "fallback" };

/** Relance commerciale personnalisée pour un prospect. */
export async function generateRelance(prospectId: string): Promise<AiText> {
  const ctx = await requireTenant();
  const p = await prisma.prospect.findFirst({
    where: { id: prospectId, organizationId: ctx.organizationId },
    include: { formationOfInterest: { include: { sessions: { where: { deletedAt: null, status: { in: ["OUVERTE", "BROUILLON"] }, endDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 1, include: { _count: { select: { enrollments: true } } } } } } },
  });
  if (!p) return { text: "Prospect introuvable.", source: "fallback" };

  const who = p.contactName || p.name;
  const fTitle = p.formationOfInterest?.title ?? "la formation qui vous intéresse";
  const nextSession = p.formationOfInterest?.sessions[0];
  const places = nextSession ? Math.max(0, nextSession.capacity - nextSession._count.enrollments) : null;
  const dateStr = nextSession ? formatDateRange(nextSession.startDate, nextSession.endDate) : null;

  const fallback = `Bonjour ${who},\n\nJe me permets de revenir vers vous concernant votre intérêt pour « ${fTitle} ».${dateStr ? ` Notre prochaine session se tiendra ${dateStr}${places ? `, et il reste ${places} place${places > 1 ? "s" : ""}.` : "."}` : ""}\n\nSouhaitez-vous que je vous réserve une place ou que je vous transmette le programme détaillé ?\n\nBien cordialement,\n${ctx.name ?? ctx.organizationName ?? ""}`;

  const prompt = `Rédige un email de relance commerciale court (max 120 mots), prêt à envoyer.
Destinataire : ${who}${p.contactName && p.contactName !== p.name ? ` (société ${p.name})` : ""}
Formation d'intérêt : ${fTitle}
${dateStr ? `Prochaine session : ${dateStr}${places ? ` — ${places} place(s) restante(s)` : ""}` : "Pas de session datée pour l'instant."}
Étape actuelle dans le pipeline : ${p.stage}.
Signe avec : ${ctx.name ?? ctx.organizationName ?? "l'équipe"}.
Donne uniquement le corps de l'email, sans objet ni commentaire.`;

  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 500 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "relance", input: prompt, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Améliore la description commerciale d'une formation. */
export async function improveFormationDescription(formationId: string): Promise<AiText> {
  const ctx = await requireTenant();
  const f = await prisma.formation.findFirst({ where: { id: formationId, organizationId: ctx.organizationId } });
  if (!f) return { text: "Formation introuvable.", source: "fallback" };

  const fallback = f.longDescription || `${f.title} — ${f.shortDescription ?? "une formation conçue pour des résultats concrets."}\n\nObjectifs : ${f.objectives ?? "à compléter"}.\nProgramme : ${f.program ?? "à compléter"}.`;

  const prompt = `Rédige une description commerciale convaincante (120-200 mots) pour cette formation, orientée bénéfices et conversion, pour une page publique.
Titre : ${f.title}
Catégorie : ${f.category ?? "—"}
Durée : ${f.durationDays ? f.durationDays + " jours" : f.durationHours ? f.durationHours + " h" : "—"}
Modalité : ${f.modality}
Objectifs : ${f.objectives ?? "—"}
Programme : ${f.program ?? "—"}
Public : ${f.targetAudience ?? "—"}
Donne uniquement le texte de la description, sans titre ni puces markdown.`;

  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 700 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "description", input: prompt, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Applique une description générée (sauvegarde). */
export async function applyFormationDescription(formationId: string, text: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const f = await prisma.formation.findFirst({ where: { id: formationId, organizationId: ctx.organizationId } });
  if (!f) return;
  await prisma.formation.update({ where: { id: formationId }, data: { longDescription: text.slice(0, 5000) } });
  revalidatePath(`/formations/${formationId}`);
}

/** Résumé hebdomadaire d'activité (pour l'assistant). */
export async function weeklySummary(): Promise<AiText> {
  const ctx = await requireTenant();
  const m = await getDashboardMetrics(ctx);
  const facts = `CA prévisionnel : ${formatMoney(m.kpis.caForecast)}. Sessions à venir : ${m.kpis.sessionsAVenir}. Remplissage moyen : ${m.kpis.avgFill}%. Prospects actifs : ${m.kpis.prospectsActifs}. Relances à faire : ${m.kpis.relances}. Documents à générer : ${m.kpis.docsToGenerate}. Alertes : ${m.alerts.map((a) => a.title).join("; ") || "aucune"}.`;

  const fallback = `Cette semaine pour ${ctx.organizationName ?? "votre centre"} : ${facts}\n\nPriorités : ${m.priorities.map((p) => p.text).join(" · ") || "rien d'urgent"}.`;

  const prompt = `Voici les indicateurs de la semaine d'un centre de formation :\n${facts}\nRédige un résumé d'activité clair (max 150 mots) suivi de 3 priorités concrètes (liste courte). Sois actionnable.`;
  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 700 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "resume_hebdo", input: facts, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Recommandations business à partir des metrics. */
export async function businessRecommendations(): Promise<AiText> {
  const ctx = await requireTenant();
  const m = await getDashboardMetrics(ctx);
  const risk = m.alerts.filter((a) => a.type === "danger" || a.type === "warn").map((a) => `${a.title} — ${a.text}`).join("\n") || "Aucune session à risque.";
  const facts = `Remplissage moyen ${m.kpis.avgFill}%, ${m.kpis.prospectsActifs} prospects actifs, ${m.kpis.relances} relances en attente.\nAlertes :\n${risk}`;
  const fallback = `Recommandations :\n- ${m.priorities.map((p) => p.text).join("\n- ") || "Rien d'urgent."}`;
  const prompt = `Analyse ces indicateurs d'un centre de formation et propose 3 à 5 actions business priorisées et concrètes (commencer par la plus impactante) :\n${facts}`;
  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 800 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "reco_business", input: facts, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Questionnaire de satisfaction pour une formation. */
export async function generateQuestionnaire(formationTitle: string): Promise<AiText> {
  const ctx = await requireTenant();
  const fallback = `Questionnaire de satisfaction — ${formationTitle}\n1. La formation a-t-elle répondu à vos attentes ? (1-5)\n2. Qualité des contenus et supports ? (1-5)\n3. Pédagogie du formateur ? (1-5)\n4. Organisation logistique ? (1-5)\n5. Recommanderiez-vous cette formation ? (1-5)\n6. Commentaires libres :`;
  const prompt = `Crée un questionnaire de satisfaction (8 questions max) pour la formation « ${formationTitle} », avec une échelle 1-5 et 1 ou 2 questions ouvertes. Format liste numérotée.`;
  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 600 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "questionnaire", input: formationTitle, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Chat conversationnel de l'assistant. */
export async function assistantChat(history: { role: "user" | "assistant"; content: string }[]): Promise<AiText> {
  const ctx = await requireTenant();
  const m = await getDashboardMetrics(ctx);
  const system = `${ORG_VOICE}\nTu es l'assistant de pilotage de ${ctx.organizationName ?? "ce centre de formation"} dans l'espace partenaires Le Bon Rebond.
Contexte temps réel : CA prévisionnel ${formatMoney(m.kpis.caForecast)}, ${m.kpis.sessionsAVenir} sessions à venir, remplissage moyen ${m.kpis.avgFill}%, ${m.kpis.prospectsActifs} prospects actifs, ${m.kpis.relances} relances à faire.
Réponds de façon concise et actionnable. Si on te demande une action (relance, document...), explique brièvement la marche à suivre dans l'outil.`;
  const lastUser = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
  const fallback = `Voici un aperçu : ${m.priorities.map((p) => p.text).join(" · ") || "tout est sous contrôle"}. (Assistant IA en mode hors-ligne — ajoutez une clé ANTHROPIC_API_KEY pour des réponses complètes.)`;
  const res = await chat(history, system, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "chat", input: lastUser, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

/** Synthèse IA des retours apprenants (pour le module Qualité). */
export async function synthesizeFeedbacks(): Promise<AiText> {
  const ctx = await requireTenant();
  const feedbacks = await prisma.feedback.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  if (feedbacks.length === 0) return { text: "Aucun retour apprenant disponible pour la synthèse.", source: "fallback" };

  const avgRating = feedbacks.reduce((a, b) => a + b.rating, 0) / feedbacks.length;
  const comments = feedbacks.filter((f) => f.comment).map((f) => `[${f.rating}/5] ${f.comment}`).join("\n");

  const fallback = `Synthèse sur ${feedbacks.length} retour(s) — Moyenne : ${avgRating.toFixed(1)}/5.\n${comments ? "Commentaires :\n" + comments.slice(0, 800) : "Pas de commentaires textuels."}`;

  const prompt = `Voici les retours apprenants d'un centre de formation (${feedbacks.length} réponses, moyenne ${avgRating.toFixed(1)}/5) :\n\n${comments || "Pas de commentaires textuels disponibles."}\n\nFais une synthèse structurée en 3 parties : 1) Points forts (2-3 points) 2) Points à améliorer (2-3 points) 3) Actions suggérées (2-3 actions concrètes). Sois factuel et concis.`;
  const res = await generateText({ system: ORG_VOICE, prompt, maxTokens: 800 }, fallback);
  await logAi({ organizationId: ctx.organizationId, userId: ctx.userId, type: "synthese_qualite", input: `${feedbacks.length} retours`, output: res.text, model: res.model });
  return { text: res.text, source: res.source };
}

export async function aiStatus(): Promise<{ enabled: boolean }> {
  return { enabled: isAiEnabled() };
}
