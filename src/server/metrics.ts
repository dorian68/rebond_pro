import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { documentSuggestions } from "@/server/documents";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

/**
 * Couche metrics centrale : tous les indicateurs du cockpit sont calculés ici
 * à partir des données réelles du tenant (jamais codés en dur).
 */
export async function getDashboardMetrics(ctx: TenantContext) {
  const orgId = ctx.organizationId;
  const now = new Date();

  const sessions = await prisma.session.findMany({
    where: { organizationId: orgId, deletedAt: null, status: { not: "ANNULEE" } },
    include: {
      _count: { select: { enrollments: true } },
      formation: { select: { id: true, title: true, color: true } },
      trainer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const withMetrics = sessions.map((s) => {
    const enrolled = s._count.enrollments;
    const fillRate = s.capacity > 0 ? Math.round((enrolled / s.capacity) * 100) : 0;
    const forecast = enrolled * s.pricePerLearner;
    const isUpcoming = s.endDate >= now && s.status !== "TERMINEE";
    const atRisk = isUpcoming && (enrolled < s.breakEvenSeats || !s.trainerId || !s.trainerConfirmed);
    return { ...s, enrolled, fillRate, forecast, isUpcoming, atRisk };
  });

  const upcoming = withMetrics.filter((s) => s.isUpcoming);

  // KPIs
  const caForecast = upcoming.reduce((acc, s) => acc + s.forecast, 0);
  const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const endOfQuarter = new Date(startOfQuarter.getFullYear(), startOfQuarter.getMonth() + 3, 0, 23, 59, 59);
  const caQuarter = upcoming
    .filter((s) => s.startDate >= startOfQuarter && s.startDate <= endOfQuarter)
    .reduce((acc, s) => acc + s.forecast, 0);

  const avgFill = upcoming.length ? Math.round(upcoming.reduce((a, s) => a + s.fillRate, 0) / upcoming.length) : 0;

  const [prospectsActifs, relances, suggestions, formationCount, trainerCount, learnerCount] = await Promise.all([
    prisma.prospect.count({ where: { organizationId: orgId, deletedAt: null, stage: { in: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE"] } } }),
    prisma.prospect.count({ where: { organizationId: orgId, deletedAt: null, nextFollowUpDate: { lte: now }, stage: { in: ["NOUVEAU", "CONTACTE", "DEVIS", "RELANCE"] } } }),
    documentSuggestions(ctx),
    prisma.formation.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.trainer.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.learner.count({ where: { organizationId: orgId, deletedAt: null } }),
  ]);
  const docsToGenerate = suggestions.length;

  // Série CA prévisionnel : 6 mois glissants + 2 mois de projection
  const series: { m: string; v: number; proj?: boolean }[] = [];
  for (let i = -5; i <= 2; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);
    const v = withMetrics
      .filter((s) => s.startDate >= monthDate && s.startDate <= monthEnd)
      .reduce((acc, s) => acc + s.forecast, 0);
    series.push({ m: MONTH_LABELS[monthDate.getMonth()], v: Math.round((v / 100 / 1000) * 10) / 10, proj: i > 0 });
  }

  // Taux de remplissage par formation (sessions à venir)
  const byFormation = new Map<string, { title: string; color: string; sum: number; n: number }>();
  for (const s of upcoming) {
    const key = s.formation.id;
    const cur = byFormation.get(key) ?? { title: s.formation.title, color: s.formation.color ?? "#2469a6", sum: 0, n: 0 };
    cur.sum += s.fillRate;
    cur.n += 1;
    byFormation.set(key, cur);
  }
  const fillByFormation = [...byFormation.values()].map((f) => ({ title: f.title, color: f.color, value: Math.round(f.sum / f.n) }));

  // Pipeline commercial
  const pipelineRaw = await prisma.prospect.groupBy({
    by: ["stage"],
    where: { organizationId: orgId, deletedAt: null },
    _count: { _all: true },
    _sum: { potentialAmount: true },
  });
  const pipeline = pipelineRaw.map((p) => ({ stage: p.stage, count: p._count._all, amount: p._sum.potentialAmount ?? 0 }));

  // Alertes
  const riskSessions = upcoming.filter((s) => s.atRisk);
  const alerts: { id: string; type: string; icon: string; title: string; text: string; href: string }[] = [];
  for (const s of riskSessions.slice(0, 3)) {
    const reason = s.enrolled < s.breakEvenSeats ? `Remplie à ${s.fillRate} % — sous le seuil de rentabilité (${s.breakEvenSeats} inscrits requis).` : !s.trainerId ? "Aucun formateur affecté." : "Formateur non confirmé.";
    alerts.push({ id: `risk-${s.id}`, type: s.enrolled < s.breakEvenSeats ? "danger" : "warn", icon: s.enrolled < s.breakEvenSeats ? "alert-triangle" : "user-x", title: `${s.formation.title} en risque`, text: reason, href: `/sessions` });
  }
  if (relances > 0) alerts.push({ id: "al-relances", type: "warn", icon: "send", title: `${relances} prospect${relances > 1 ? "s" : ""} à relancer`, text: "Des relances commerciales sont en attente cette semaine.", href: "/prospects" });
  if (docsToGenerate > 0) alerts.push({ id: "al-docs", type: "primary", icon: "file-text", title: `${docsToGenerate} document${docsToGenerate > 1 ? "s" : ""} à générer`, text: "Des documents administratifs sont en attente.", href: "/documents" });

  // Priorités de la semaine
  const priorities: { id: string; text: string; href: string }[] = [];
  if (relances > 0) priorities.push({ id: "p-rel", text: `Relancer ${relances} prospect${relances > 1 ? "s" : ""} en attente`, href: "/prospects" });
  const noTrainer = upcoming.filter((s) => !s.trainerId || !s.trainerConfirmed);
  if (noTrainer.length) priorities.push({ id: "p-form", text: `Confirmer un formateur pour ${noTrainer.length} session${noTrainer.length > 1 ? "s" : ""}`, href: "/planning" });
  const worst = riskSessions.filter((s) => s.enrolled < s.breakEvenSeats).sort((a, b) => a.fillRate - b.fillRate)[0];
  if (worst) priorities.push({ id: "p-fill", text: `Remplir « ${worst.formation.title} » (${worst.fillRate} %)`, href: "/sessions" });
  if (docsToGenerate > 0) priorities.push({ id: "p-doc", text: `Générer ${docsToGenerate} document${docsToGenerate > 1 ? "s" : ""} en attente`, href: "/documents" });

  // Reco IA (déterministe pour l'instant — branchée sur Claude au lot IA)
  let aiReco: { text: string } | null = null;
  if (worst) {
    const manque = Math.max(0, worst.breakEvenSeats - worst.enrolled);
    aiReco = { text: `Votre session « ${worst.formation.title} » est remplie à ${worst.fillRate} %. Il manque ${manque} inscription${manque > 1 ? "s" : ""} pour atteindre le seuil de rentabilité. Vous avez ${prospectsActifs} prospects actifs dans le CRM qui pourraient être relancés aujourd'hui.` };
  }

  return {
    kpis: { caForecast, caQuarter, sessionsAVenir: upcoming.length, avgFill, prospectsActifs, relances, docsToGenerate },
    series,
    fillByFormation,
    pipeline,
    alerts,
    priorities,
    aiReco,
    setup: { formationCount, sessionCount: sessions.length, trainerCount, learnerCount, prospectCount: prospectsActifs },
  };
}
