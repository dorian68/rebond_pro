import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { formatDateRange } from "@/lib/utils";

export type DocItem = Awaited<ReturnType<typeof listDocuments>>[number];

export async function listDocuments(ctx: TenantContext) {
  const docs = await prisma.document.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      formation: { select: { title: true } },
      session: { include: { formation: { select: { title: true } } } },
      enrollment: { include: { learner: { select: { firstName: true, lastName: true, email: true } } } },
    },
    take: 200,
  });
  return docs.map((d) => {
    const target = d.enrollment
      ? `${d.enrollment.learner.firstName} ${d.enrollment.learner.lastName}`
      : d.session?.formation.title ?? d.formation?.title ?? "—";
    return {
      id: d.id, type: d.type, status: d.status, fileUrl: d.fileUrl,
      target, generatedAt: d.generatedAt, sentAt: d.sentAt,
      hasEmail: !!d.enrollment?.learner.email,
    };
  });
}

/** Suggestions « à générer » calculées à partir de l'activité. */
export async function documentSuggestions(ctx: TenantContext) {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null, status: { not: "ANNULEE" } },
    include: {
      formation: { select: { title: true } },
      _count: { select: { enrollments: true } },
      documents: { select: { type: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const suggestions: { sessionId: string; label: string; type: string; count: number; reason: string }[] = [];
  for (const s of sessions) {
    const types = new Set(s.documents.map((d) => d.type));
    const upcoming = s.endDate >= now && s.status !== "TERMINEE";
    const done = s.status === "TERMINEE";
    const range = formatDateRange(s.startDate, s.endDate);
    if (upcoming && s._count.enrollments > 0 && !types.has("CONVOCATION")) {
      suggestions.push({ sessionId: s.id, label: `Convocations — ${s.formation.title}`, type: "CONVOCATION", count: s._count.enrollments, reason: `${range} · ${s._count.enrollments} apprenant(s)` });
    }
    if (upcoming && !types.has("EMARGEMENT")) {
      suggestions.push({ sessionId: s.id, label: `Feuille d'émargement — ${s.formation.title}`, type: "EMARGEMENT", count: 1, reason: range });
    }
    if (done && s._count.enrollments > 0 && !types.has("ATTESTATION")) {
      suggestions.push({ sessionId: s.id, label: `Attestations — ${s.formation.title}`, type: "ATTESTATION", count: s._count.enrollments, reason: `Terminée ${range}` });
    }
  }
  return suggestions.slice(0, 12);
}
