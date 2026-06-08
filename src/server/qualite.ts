import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export async function getQualityMetrics(ctx: TenantContext) {
  const orgId = ctx.organizationId;

  const [feedbacks, enrollments, complaints, improvementActions] = await Promise.all([
    prisma.feedback.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    prisma.enrollment.findMany({ where: { organizationId: orgId } }),
    prisma.complaint.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
    prisma.improvementAction.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" } }),
  ]);

  const ratings = feedbacks.filter((f) => f.rating > 0).map((f) => f.rating);
  const avgSatisfaction = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  const present = enrollments.filter((e) => e.status === "PRESENT" || e.status === "TERMINE").length;
  const total = enrollments.filter((e) => e.status !== "PRE_INSCRIT").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : null;

  const completed = enrollments.filter((e) => e.status === "TERMINE").length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : null;

  const openComplaints = complaints.filter((c) => c.status === "OUVERTE" || c.status === "EN_COURS").length;
  const openActions = improvementActions.filter((a) => a.status === "OUVERTE" || a.status === "EN_COURS").length;

  // Série satisfaction sur 6 mois
  const now = new Date();
  const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const series: { m: string; v: number | null }[] = [];
  for (let i = -5; i <= 0; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);
    const monthFeedbacks = feedbacks.filter((f) => f.createdAt >= monthDate && f.createdAt <= monthEnd && f.rating > 0);
    const avg = monthFeedbacks.length ? Math.round((monthFeedbacks.reduce((a, b) => a + b.rating, 0) / monthFeedbacks.length) * 10) / 10 : null;
    series.push({ m: MONTH_LABELS[monthDate.getMonth()], v: avg });
  }

  return { avgSatisfaction, attendanceRate, completionRate, openComplaints, openActions, feedbacks, complaints, improvementActions, series };
}

export type QualityMetrics = Awaited<ReturnType<typeof getQualityMetrics>>;
