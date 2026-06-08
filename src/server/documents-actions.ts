"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole, type TenantContext } from "@/lib/tenant";
import { renderDocumentPdf, type DocData } from "@/server/pdf/templates";
import { saveFile, deleteFile, readFile } from "@/lib/storage";
import { sendEmail, brandedEmail } from "@/lib/email";
import { formatMoney, formatDateRange } from "@/lib/utils";
import { MODALITY_LABELS } from "@/lib/labels";

const DOC_LABELS: Record<string, string> = {
  CONVOCATION: "Votre convocation", ATTESTATION: "Votre attestation de formation", CERTIFICAT: "Votre certificat de réalisation",
  CONVENTION: "Votre convention de formation", PROGRAMME: "Programme de formation", EMARGEMENT: "Feuille d'émargement", DEVIS: "Votre devis",
};

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;
const PER_LEARNER = ["CONVOCATION", "ATTESTATION", "CERTIFICAT"];

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

async function persistDoc(ctx: TenantContext, type: string, ids: { sessionId?: string; enrollmentId?: string; formationId?: string }, data: DocData) {
  const buf = await renderDocumentPdf(data);
  const doc = await prisma.document.create({
    data: { organizationId: ctx.organizationId, type: type as never, status: "GENERE", generatedAt: new Date(), sessionId: ids.sessionId ?? null, enrollmentId: ids.enrollmentId ?? null, formationId: ids.formationId ?? null },
  });
  const key = `documents/${ctx.organizationId}/${doc.id}.pdf`;
  await saveFile(key, buf);
  await prisma.document.update({ where: { id: doc.id }, data: { fileUrl: key } });
  return doc.id;
}

/** Action principale : génère un document (unitaire ou en lot selon le type). */
export async function generateDocuments(formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const type = String(formData.get("type") || "");
  const sessionId = String(formData.get("sessionId") || "");
  if (!type || !sessionId) return;
  const s = await loadSession(ctx, sessionId);
  if (!s) return;
  const org = await orgLegal(ctx);

  if (PER_LEARNER.includes(type)) {
    for (const e of s.enrollments) {
      const data = baseData(org, type, s);
      data.learner = { fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company };
      await persistDoc(ctx, type, { sessionId, enrollmentId: e.id }, data);
    }
  } else {
    const data = baseData(org, type, s);
    if (type === "EMARGEMENT") data.learners = s.enrollments.map((e) => ({ fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company }));
    if ((type === "CONVENTION" || type === "DEVIS") && s.enrollments[0]) data.learner = { fullName: `${s.enrollments[0].learner.firstName} ${s.enrollments[0].learner.lastName}`, company: s.enrollments[0].learner.company };
    await persistDoc(ctx, type, { sessionId, formationId: s.formationId }, data);
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
    attachments: [{ filename: `${doc.type.toLowerCase()}.pdf`, content: buf }],
  });
  await prisma.document.update({ where: { id: documentId }, data: { status: "ENVOYE", sentAt: new Date() } });
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
      if (PER_LEARNER.includes(type)) {
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
