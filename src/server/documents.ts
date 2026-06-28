import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { formatDateRange } from "@/lib/utils";
import { DOC_LABELS } from "@/lib/document-types";
import { getDocumentGenerationPreflight, resolveDocumentTemplate } from "@/server/documents/document-context";

export type DocItem = Awaited<ReturnType<typeof listDocuments>>[number];
type DocumentSuggestionCandidate = {
  sessionId: string;
  formationTitle: string;
  type: string;
  count: number;
  reason: string;
  dueLabel: string;
};

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

async function documentSuggestionCandidates(ctx: TenantContext): Promise<DocumentSuggestionCandidate[]> {
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

  const candidates: DocumentSuggestionCandidate[] = [];
  function pushCandidate(s: (typeof sessions)[number], type: string, count: number, reason: string, dueLabel: string) {
    candidates.push({
      sessionId: s.id,
      formationTitle: s.formation.title,
      type,
      count,
      reason,
      dueLabel,
    });
  }

  for (const s of sessions) {
    const types = new Set(s.documents.map((d) => d.type));
    const upcoming = s.endDate >= now && s.status !== "TERMINEE";
    const done = s.status === "TERMINEE";
    const range = formatDateRange(s.startDate, s.endDate);
    if (upcoming && s._count.enrollments > 0 && !types.has("CONVOCATION")) {
      pushCandidate(s, "CONVOCATION", s._count.enrollments, `${range} · ${s._count.enrollments} apprenant(s)`, "Avant session");
    }
    if (upcoming && !types.has("EMARGEMENT")) {
      pushCandidate(s, "EMARGEMENT", 1, range, "Pendant session");
    }
    if (done && s._count.enrollments > 0 && !types.has("ATTESTATION")) {
      pushCandidate(s, "ATTESTATION", s._count.enrollments, `Terminée ${range}`, "Après session");
    }
    if (upcoming && !types.has("PROGRAMME")) pushCandidate(s, "PROGRAMME", 1, range, "Avant session");
    if (upcoming && s._count.enrollments > 0 && !types.has("CONVENTION")) pushCandidate(s, "CONVENTION", 1, `${range} · à préparer`, "Avant session");
    if (done && s._count.enrollments > 0 && !types.has("QUESTIONNAIRE_SATISFACTION")) pushCandidate(s, "QUESTIONNAIRE_SATISFACTION", s._count.enrollments, `Terminée ${range}`, "Après session");
  }
  return candidates;
}

export async function countDocumentSuggestions(ctx: TenantContext) {
  const candidates = await documentSuggestionCandidates(ctx);
  return candidates.length;
}

/** Suggestions « à générer » calculées à partir de l'activité. */
export async function documentSuggestions(ctx: TenantContext) {
  const candidates = await documentSuggestionCandidates(ctx);
  // Les preflights/templates sont indépendants entre candidats : on les calcule EN PARALLÈLE
  // (auparavant en série, ce qui multipliait la latence DB par le nombre de candidats → page lente).
  return Promise.all(
    candidates.slice(0, 12).map(async (candidate) => {
      const [preflight, template] = await Promise.all([
        getDocumentGenerationPreflight({ ctx, type: candidate.type, sessionId: candidate.sessionId }),
        resolveDocumentTemplate({ ctx, type: candidate.type }),
      ]);
      return {
        sessionId: candidate.sessionId,
        label: `${DOC_LABELS[candidate.type] ?? candidate.type} — ${candidate.formationTitle}`,
        type: candidate.type,
        count: candidate.count,
        reason: candidate.reason,
        dueLabel: candidate.dueLabel,
        completionStatus: preflight.completionStatus,
        completionScore: preflight.completionScore,
        missingCount: preflight.missingVariables.length,
        templateName: template.name,
        engineLabel: preflight.engineLabel,
      };
    }),
  );
}
