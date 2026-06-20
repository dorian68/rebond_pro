"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole, type TenantContext } from "@/lib/tenant";
import { renderDocumentPdf, type DocData } from "@/server/pdf/templates";
import { saveFile, deleteFile, readFile } from "@/lib/storage";
import { sendEmail, brandedEmail } from "@/lib/email";
import { formatMoney, formatDateRange } from "@/lib/utils";
import { MODALITY_LABELS } from "@/lib/labels";
import { DOC_LABELS, PER_LEARNER_DOCUMENT_TYPES } from "@/lib/document-types";
import { renderDocxTemplate } from "@/server/docx/template-engine";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;
const PER_LEARNER = [...PER_LEARNER_DOCUMENT_TYPES];
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function orgLegal(ctx: TenantContext) {
  const o = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { name: true, legalName: true, legalAddress: true, nda: true, legalRep: true } });
  return o!;
}

function nowText(): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());
}

type Ses = NonNullable<Awaited<ReturnType<typeof loadSession>>>;
function loadSession(ctx: TenantContext, sessionId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, organizationId: ctx.organizationId },
    include: {
      formation: true,
      trainer: { select: { firstName: true, lastName: true } },
      room: { select: { name: true } },
      enrollments: { include: { learner: true } },
    },
  });
}

function baseData(org: Awaited<ReturnType<typeof orgLegal>>, type: string, s: Ses): DocData {
  return {
    type,
    org,
    generatedAt: nowText(),
    formation: { title: s.formation.title, durationDays: s.formation.durationDays, durationHours: s.formation.durationHours, price: s.pricePerLearner, program: s.formation.program, objectives: s.formation.objectives, modality: MODALITY_LABELS[s.formation.modality] },
    session: { dateRange: formatDateRange(s.startDate, s.endDate), trainerName: s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : null, roomName: s.room?.name ?? null },
    amountText: formatMoney(s.pricePerLearner),
  };
}

async function auditDocumentEvent(ctx: TenantContext, action: string, entityId: string, after: Prisma.InputJsonObject) {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action,
      entityType: "Document",
      entityId,
      after,
    },
  }).catch((e) => {
    logger.error("documents.audit_failed", {
      organizationId: ctx.organizationId,
      action,
      entityId,
      error: e instanceof Error ? e.message : String(e),
    });
  });
}

async function resolveTemplate(ctx: TenantContext, type: string, templateId?: string | null) {
  if (templateId && templateId !== "__builtin") {
    return prisma.documentTemplate.findFirst({
      where: {
        id: templateId,
        type: type as never,
        OR: [{ organizationId: ctx.organizationId }, { organizationId: null }],
      },
    });
  }
  return prisma.documentTemplate.findFirst({
    where: {
      type: type as never,
      engine: "DOCX",
      sourceFileUrl: { not: null },
      OR: [{ organizationId: ctx.organizationId }, { organizationId: null }],
    },
    orderBy: [{ organizationId: "desc" }, { updatedAt: "desc" }],
  });
}

async function renderDocument(
  template: Awaited<ReturnType<typeof resolveTemplate>>,
  data: DocData,
): Promise<{ buffer: Buffer; extension: "docx" | "pdf"; mimeType: string; templateId?: string }> {
  if (template?.engine === "DOCX" && template.sourceFileUrl) {
    const source = await readFile(template.sourceFileUrl);
    return {
      buffer: renderDocxTemplate(source, data),
      extension: "docx",
      mimeType: DOCX_MIME,
      templateId: template.id,
    };
  }
  return {
    buffer: await renderDocumentPdf(data),
    extension: "pdf",
    mimeType: "application/pdf",
    templateId: template?.id,
  };
}

async function persistDoc(ctx: TenantContext, type: string, ids: { sessionId?: string; enrollmentId?: string; formationId?: string }, data: DocData, templateId?: string | null) {
  const template = await resolveTemplate(ctx, type, templateId);
  const rendered = await renderDocument(template, data);
  const doc = await prisma.document.create({
    data: {
      organizationId: ctx.organizationId,
      type: type as never,
      status: "GENERE",
      generatedAt: new Date(),
      sessionId: ids.sessionId ?? null,
      enrollmentId: ids.enrollmentId ?? null,
      formationId: ids.formationId ?? null,
      templateId: rendered.templateId ?? null,
      mimeType: rendered.mimeType,
    },
  });
  const fileName = `${type.toLowerCase()}-${doc.id}.${rendered.extension}`;
  const key = `documents/${ctx.organizationId}/${fileName}`;
  await saveFile(key, rendered.buffer);
  await prisma.document.update({ where: { id: doc.id }, data: { fileUrl: key, fileName } });
  await auditDocumentEvent(ctx, "document.generated", doc.id, {
    type,
    sessionId: ids.sessionId ?? null,
    enrollmentId: ids.enrollmentId ?? null,
    formationId: ids.formationId ?? null,
    templateId: rendered.templateId ?? null,
    mimeType: rendered.mimeType,
    fileName,
  });
  return doc.id;
}

/** Action principale : génère un document (unitaire ou en lot selon le type). */
export async function generateDocuments(formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const type = String(formData.get("type") || "");
  const sessionId = String(formData.get("sessionId") || "");
  const templateId = String(formData.get("templateId") || "") || null;
  if (!type || !sessionId) return;
  const s = await loadSession(ctx, sessionId);
  if (!s) return;
  const org = await orgLegal(ctx);

  if ((PER_LEARNER as readonly string[]).includes(type)) {
    for (const e of s.enrollments) {
      const data = baseData(org, type, s);
      data.learner = { fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company };
      await persistDoc(ctx, type, { sessionId, enrollmentId: e.id }, data, templateId);
    }
  } else {
    const data = baseData(org, type, s);
    if (type === "EMARGEMENT") data.learners = s.enrollments.map((e) => ({ fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company }));
    if ((type === "CONVENTION" || type === "DEVIS") && s.enrollments[0]) data.learner = { fullName: `${s.enrollments[0].learner.firstName} ${s.enrollments[0].learner.lastName}`, company: s.enrollments[0].learner.company };
    await persistDoc(ctx, type, { sessionId, formationId: s.formationId }, data, templateId);
  }

  revalidatePath("/documents");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
}

/** Génère un document pour une inscription précise (depuis fiche session/apprenant). */
export async function generateForEnrollment(enrollmentId: string, type: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const e = await prisma.enrollment.findFirst({ where: { id: enrollmentId, organizationId: ctx.organizationId }, select: { sessionId: true } });
  if (!e) return;
  const s = await loadSession(ctx, e.sessionId);
  if (!s) return;
  const enr = s.enrollments.find((x) => x.id === enrollmentId);
  if (!enr) return;
  const org = await orgLegal(ctx);
  const data = baseData(org, type, s);
  data.learner = { fullName: `${enr.learner.firstName} ${enr.learner.lastName}`, company: enr.learner.company };
  await persistDoc(ctx, type, { sessionId: s.id, enrollmentId }, data);
  revalidatePath("/documents");
  revalidatePath(`/sessions/${s.id}`);
}

/** Envoie un document généré par email (à l'apprenant si lié à une inscription). */
export async function sendDocument(documentId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const doc = await prisma.document.findFirst({
    where: { id: documentId, organizationId: ctx.organizationId },
    include: { enrollment: { include: { learner: { select: { firstName: true, email: true } } } }, session: { include: { formation: { select: { title: true } } } }, formation: { select: { title: true } } },
  });
  if (!doc || !doc.fileUrl) return { ok: false, error: "Document introuvable." };
  const to = doc.enrollment?.learner.email;
  if (!to) return { ok: false, error: "Aucune adresse email pour le destinataire." };

  const buf = await readFile(doc.fileUrl);
  const title = DOC_LABELS[doc.type] ?? "Votre document";
  const formationTitle = doc.session?.formation.title ?? doc.formation?.title ?? "";
  await sendEmail({
    to,
    subject: `${title}${formationTitle ? ` — ${formationTitle}` : ""}`,
    html: brandedEmail(title, `Bonjour ${doc.enrollment?.learner.firstName ?? ""},<br/><br/>Vous trouverez votre document en pièce jointe.<br/><br/>Cordialement,<br/>${ctx.organizationName ?? "Votre centre de formation"}`),
    attachments: [{ filename: doc.fileName ?? `${doc.type.toLowerCase()}.pdf`, content: buf }],
  });
  await prisma.document.update({ where: { id: documentId }, data: { status: "ENVOYE", sentAt: new Date() } });
  await auditDocumentEvent(ctx, "document.sent", documentId, {
    type: doc.type,
    to,
    fileName: doc.fileName ?? `${doc.type.toLowerCase()}.pdf`,
    mimeType: doc.mimeType ?? "application/pdf",
  });
  revalidatePath("/documents");
  return { ok: true };
}

/**
 * Génération en lot asynchrone : crée un BackgroundJob et le traite
 * de façon non-bloquante dans le même process via setImmediate.
 * Retourne l'id du job pour polling depuis l'UI.
 */
export async function generateDocumentsBulkAsync(sessionId: string, type: string): Promise<{ jobId: string }> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const { enqueueJob, startJob, completeJob, failJob } = await import("@/lib/jobs");
  const jobId = await enqueueJob(ctx, "pdf_bulk", { sessionId, type });

  // Traitement asynchrone en arrière-plan (non bloquant pour la réponse)
  setImmediate(async () => {
    try {
      await startJob(jobId);
      const s = await loadSession(ctx, sessionId);
      if (!s) { await failJob(jobId, "Session introuvable."); return; }
      const org = await orgLegal(ctx);
      if ((PER_LEARNER as readonly string[]).includes(type)) {
        for (const e of s.enrollments) {
          const data = baseData(org, type, s);
          data.learner = { fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company };
          await persistDoc(ctx, type, { sessionId, enrollmentId: e.id }, data);
        }
      } else {
        const data = baseData(org, type, s);
        if (type === "EMARGEMENT") data.learners = s.enrollments.map((e) => ({ fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company }));
        await persistDoc(ctx, type, { sessionId, formationId: s.formationId }, data);
      }
      await completeJob(jobId);
    } catch (err) {
      const { failJob: fail } = await import("@/lib/jobs");
      await fail(jobId, String(err));
    }
  });

  return { jobId };
}

export async function deleteDocument(documentId: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const doc = await prisma.document.findFirst({ where: { id: documentId, organizationId: ctx.organizationId } });
  if (!doc) return;
  if (doc.fileUrl) await deleteFile(doc.fileUrl);
  await prisma.document.delete({ where: { id: documentId } });
  revalidatePath("/documents");
}
