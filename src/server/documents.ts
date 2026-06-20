import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { formatDateRange } from "@/lib/utils";
import { DOC_LABELS } from "@/lib/document-types";
import { getDocumentGenerationPreflight, resolveDocumentTemplate } from "@/server/documents/document-context";

export type DocItem = Awaited<ReturnType<typeof listDocuments>>[number];

export async function listDocuments(ctx: TenantContext) {
  const docs = await prisma.document.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      formation: { select: { title: true } },
      session: { include: { formation: { select: { title: true } } } },
      enrollment: { include: { learner: { select: { firstName: true, lastName: true, email: true } } } },
      template: { select: { name: true, engine: true } },
    },
    take: 200,
  });
  return docs.map((d) => {
    const target = d.enrollment
      ? `${d.enrollment.learner.firstName} ${d.enrollment.learner.lastName}`
      : d.session?.formation.title ?? d.formation?.title ?? "—";
    return {
      id: d.id, type: d.type, status: d.status, fileUrl: d.fileUrl, fileName: d.fileName, mimeType: d.mimeType,
      target, generatedAt: d.generatedAt, sentAt: d.sentAt,
      hasEmail: !!d.enrollment?.learner.email,
      templateName: d.template?.name ?? null,
      templateEngine: d.template?.engine ?? null,
      completionStatus: d.completionStatus,
      completionScore: d.completionScore,
      missingVariables: Array.isArray(d.missingVariables) ? d.missingVariables : [],
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

  const suggestions: { sessionId: string; label: string; type: string; count: number; reason: string; dueLabel: string; completionStatus: string; completionScore: number; missingCount: number; templateName: string; engineLabel: string }[] = [];
  async function pushSuggestion(s: (typeof sessions)[number], type: string, count: number, reason: string, dueLabel: string) {
    const [preflight, template] = await Promise.all([
      getDocumentGenerationPreflight({ ctx, type, sessionId: s.id }),
      resolveDocumentTemplate({ ctx, type }),
    ]);
    suggestions.push({
      sessionId: s.id,
      label: `${DOC_LABELS[type] ?? type} — ${s.formation.title}`,
      type,
      count,
      reason,
      dueLabel,
      completionStatus: preflight.completionStatus,
      completionScore: preflight.completionScore,
      missingCount: preflight.missingVariables.length,
      templateName: template.name,
      engineLabel: preflight.engineLabel,
    });
  }
  for (const s of sessions) {
    const types = new Set(s.documents.map((d) => d.type));
    const upcoming = s.endDate >= now && s.status !== "TERMINEE";
    const done = s.status === "TERMINEE";
    const range = formatDateRange(s.startDate, s.endDate);
    if (upcoming && s._count.enrollments > 0 && !types.has("CONVOCATION")) {
      await pushSuggestion(s, "CONVOCATION", s._count.enrollments, `${range} · ${s._count.enrollments} apprenant(s)`, "Avant session");
    }
    if (upcoming && !types.has("EMARGEMENT")) {
      await pushSuggestion(s, "EMARGEMENT", 1, range, "Pendant session");
    }
    if (done && s._count.enrollments > 0 && !types.has("ATTESTATION")) {
      await pushSuggestion(s, "ATTESTATION", s._count.enrollments, `Terminée ${range}`, "Après session");
    }
    if (upcoming && !types.has("PROGRAMME")) await pushSuggestion(s, "PROGRAMME", 1, range, "Avant session");
    if (upcoming && s._count.enrollments > 0 && !types.has("CONVENTION")) await pushSuggestion(s, "CONVENTION", 1, `${range} · à préparer`, "Avant session");
    if (done && s._count.enrollments > 0 && !types.has("QUESTIONNAIRE_SATISFACTION")) await pushSuggestion(s, "QUESTIONNAIRE_SATISFACTION", s._count.enrollments, `Terminée ${range}`, "Après session");
  }
  return suggestions.slice(0, 12);
}
