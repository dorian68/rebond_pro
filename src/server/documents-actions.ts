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
import { sanitizeDocxForClient, isDocxMime } from "@/server/docx/sanitize";
import { uploadExternalDocumentFile } from "@/server/connectors";
import type { ConnectorScope } from "@/lib/connectors";
import { contextSnapshot, DOCX_MIME, getDocumentGenerationPreflight, type DocumentPreflight } from "@/server/documents/document-context";
import { readablePlaceholder } from "@/server/documents/document-context";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;
const PER_LEARNER = [...PER_LEARNER_DOCUMENT_TYPES];
export type DocumentActionState = { ok?: boolean; error?: string; message?: string };

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

function orgOnlyData(org: Awaited<ReturnType<typeof orgLegal>>, type: string): DocData {
  return {
    type,
    org,
    generatedAt: nowText(),
  };
}

function withReadableMissing(preflight: DocumentPreflight): Record<string, string | number | null | undefined> {
  const values = { ...preflight.values };
  for (const missing of preflight.missingVariables) values[missing.key] = readablePlaceholder(missing.key);
  return values;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function enrichDocData(data: DocData, values: Record<string, string | number | null | undefined>): DocData {
  const learnerName = firstText(values.learner_name, values.apprenant_nom, values.beneficiaire_nom, values.client_nom, data.learner?.fullName);
  const learnerCompany = firstText(values.learner_company, values.apprenant_entreprise, values.company_name, values.client_entreprise, data.learner?.company);
  return {
    ...data,
    generatedAt: String(values.generatedAt ?? data.generatedAt),
    org: {
      ...data.org,
      name: firstText(values.org_name, values.centre_nom, data.org.name) ?? data.org.name,
      legalName: firstText(values.org_legal_name, data.org.legalName) ?? "",
      legalAddress: firstText(values.org_legal_address, values.centre_adresse, data.org.legalAddress) ?? "",
      nda: firstText(values.org_nda, values.centre_nda, data.org.nda) ?? "",
      legalRep: firstText(values.org_legal_rep, values.signataire_nom, values.referent_nom, data.org.legalRep) ?? "",
    },
    formation: data.formation ? {
      ...data.formation,
      title: firstText(values.formation_title, values.formation_titre, data.formation.title) ?? data.formation.title,
      durationDays: typeof values.formation_duration_days === "number" ? values.formation_duration_days : data.formation.durationDays,
      durationHours: typeof values.formation_duration_hours === "number" ? values.formation_duration_hours : data.formation.durationHours,
      program: firstText(values.formation_program, values.formation_programme, data.formation.program) ?? "",
      objectives: firstText(values.formation_objectives, values.formation_objectifs, values.objectifs_pedagogiques, data.formation.objectives) ?? "",
      modality: firstText(values.formation_modality, values.formation_modalite, data.formation.modality) ?? "",
    } : data.formation,
    session: data.session ? {
      ...data.session,
      dateRange: firstText(values.session_date_range, values.session_dates, values.session_date, data.session.dateRange) ?? data.session.dateRange,
      trainerName: firstText(values.trainer_name, values.formateur_nom, data.session.trainerName) ?? "",
      roomName: firstText(values.room_name, values.session_location, values.session_lieu, values.lieu, data.session.roomName) ?? "",
    } : data.session,
    learner: learnerName ? {
      fullName: learnerName,
      company: learnerCompany ?? "",
    } : data.learner,
    amountText: firstText(values.amountText, values.prix_total, values.montant, data.amountText) ?? "",
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

async function renderDocument(
  preflight: DocumentPreflight,
  data: DocData,
): Promise<{ buffer: Buffer; extension: "docx" | "pdf"; mimeType: string; templateId?: string; templateVersion?: number }> {
  const values = withReadableMissing(preflight);
  const dataForRender = enrichDocData(data, values);
  if (preflight.template.engine === "DOCX" && preflight.template.sourceFileUrl) {
    try {
      const source = await readFile(preflight.template.sourceFileUrl);
      return {
        buffer: renderDocxTemplate(source, dataForRender, { values, missingVariableStrategy: "readable_placeholder" }),
        extension: "docx",
        mimeType: DOCX_MIME,
        templateId: preflight.template.id,
        templateVersion: preflight.template.version,
      };
    } catch (e) {
      // Filet de sécurité : un modèle DOCX corrompu ne doit jamais bloquer la génération.
      // On bascule sur le PDF intégré (toujours fonctionnel) plutôt que d'échouer.
      logger.error("documents.docx_render_fallback_pdf", {
        templateId: preflight.template.id,
        templateName: preflight.template.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return {
    buffer: await renderDocumentPdf(dataForRender),
    extension: "pdf",
    mimeType: "application/pdf",
  };
}

async function persistDoc(
  ctx: TenantContext,
  type: string,
  ids: { sessionId?: string; enrollmentId?: string; formationId?: string },
  data: DocData,
  templateId?: string | null,
  manualOverrides?: unknown,
) {
  const preflight = await getDocumentGenerationPreflight({ ctx, type, sessionId: ids.sessionId, enrollmentId: ids.enrollmentId, templateId, manualOverrides });
  const rendered = await renderDocument(preflight, data);
  const fileId = randomUUID();
  const fileName = `${type.toLowerCase()}-${fileId}.${rendered.extension}`;
  const key = `documents/${ctx.organizationId}/${fileName}`;
  await saveFile(key, rendered.buffer);
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
      templateVersion: rendered.templateVersion ?? null,
      completionStatus: preflight.completionStatus,
      completionScore: preflight.completionScore,
      missingVariables: preflight.missingVariables as unknown as Prisma.InputJsonValue,
      generationContextSnapshot: contextSnapshot(preflight) as Prisma.InputJsonValue,
      manualOverrides: (manualOverrides && typeof manualOverrides === "object" ? manualOverrides : {}) as Prisma.InputJsonValue,
      mimeType: rendered.mimeType,
      fileUrl: key,
      fileName,
    },
  });
  await auditDocumentEvent(ctx, "document.generated", doc.id, {
    type,
    sessionId: ids.sessionId ?? null,
    enrollmentId: ids.enrollmentId ?? null,
    formationId: ids.formationId ?? null,
    templateId: rendered.templateId ?? null,
    templateVersion: rendered.templateVersion ?? null,
    mimeType: rendered.mimeType,
    fileName,
    completionStatus: preflight.completionStatus,
    completionScore: preflight.completionScore,
    missingVariablesCount: preflight.missingVariables.length,
  });
  return doc.id;
}

/** Action principale : génère un document (unitaire ou en lot selon le type). */
export async function generateDocuments(formData: FormData): Promise<DocumentActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const type = String(formData.get("type") || "");
  const sessionId = String(formData.get("sessionId") || "");
  const templateId = String(formData.get("templateId") || "") || null;
  const manualOverridesRaw = String(formData.get("manualOverrides") || "").trim();
  let manualOverrides: unknown = {};
  if (manualOverridesRaw) {
    try {
      manualOverrides = JSON.parse(manualOverridesRaw);
    } catch {
      return { error: "Compléments manuels invalides (JSON attendu)." };
    }
  }
  if (!type || !sessionId) return { error: "Type de document et session requis." };
  const s = await loadSession(ctx, sessionId);
  if (!s) return { error: "Session introuvable." };
  const org = await orgLegal(ctx);
  let count = 0;

  try {
    if ((PER_LEARNER as readonly string[]).includes(type)) {
      if (s.enrollments.length === 0) return { error: "Aucun apprenant inscrit sur cette session pour ce document individuel." };
      for (const e of s.enrollments) {
        const data = baseData(org, type, s);
        data.learner = { fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company };
        await persistDoc(ctx, type, { sessionId, enrollmentId: e.id }, data, templateId, manualOverrides);
        count += 1;
      }
    } else {
      const data = baseData(org, type, s);
      if (type === "EMARGEMENT") data.learners = s.enrollments.map((e) => ({ fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company }));
      if ((type === "CONVENTION" || type === "DEVIS") && s.enrollments[0]) data.learner = { fullName: `${s.enrollments[0].learner.firstName} ${s.enrollments[0].learner.lastName}`, company: s.enrollments[0].learner.company };
      await persistDoc(ctx, type, { sessionId, formationId: s.formationId }, data, templateId, manualOverrides);
      count = 1;
    }
  } catch (e) {
    logger.error("documents.generate_failed", {
      organizationId: ctx.organizationId,
      type,
      sessionId,
      templateId,
      error: e instanceof Error ? e.message : String(e),
    });
    return { error: e instanceof Error ? e.message : "Génération impossible." };
  }

  revalidatePath("/documents");
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return { ok: true, message: `${count} document${count > 1 ? "s" : ""} généré${count > 1 ? "s" : ""}.` };
}

export async function getDocumentGenerationPreflightAction(formData: FormData): Promise<{ ok: true; preflight: DocumentPreflight } | { ok: false; error: string }> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const type = String(formData.get("type") || "");
  const sessionId = String(formData.get("sessionId") || "");
  const templateId = String(formData.get("templateId") || "") || null;
  const manualOverridesRaw = String(formData.get("manualOverrides") || "").trim();
  let manualOverrides: unknown = {};
  if (manualOverridesRaw) {
    try {
      manualOverrides = JSON.parse(manualOverridesRaw);
    } catch {
      return { ok: false, error: "Compléments manuels invalides (JSON attendu)." };
    }
  }
  if (!type || !sessionId) return { ok: false, error: "Type de document et session requis." };
  const preflight = await getDocumentGenerationPreflight({ ctx, type, sessionId, templateId, manualOverrides });
  return { ok: true, preflight };
}

export async function generateDocumentsAction(_prev: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  return generateDocuments(formData);
}

export async function generateDocumentFromAgent(input: {
  ctx: TenantContext;
  type: string;
  sessionId?: string | null;
  templateId?: string | null;
  manualOverrides?: unknown;
}): Promise<DocumentActionState & { documentIds?: string[] }> {
  const { ctx, type, sessionId, templateId, manualOverrides } = input;
  requireRole(ctx, [...EDITORS]);
  if (!type) return { error: "Type de document requis." };

  const org = await orgLegal(ctx);
  const documentIds: string[] = [];
  try {
    if (sessionId) {
      const s = await loadSession(ctx, sessionId);
      if (!s) return { error: "Session introuvable." };
      if ((PER_LEARNER as readonly string[]).includes(type)) {
        if (s.enrollments.length === 0) return { error: "Aucun apprenant inscrit sur cette session pour ce document individuel." };
        for (const e of s.enrollments) {
          const data = baseData(org, type, s);
          data.learner = { fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company };
          documentIds.push(await persistDoc(ctx, type, { sessionId, enrollmentId: e.id }, data, templateId, manualOverrides));
        }
      } else {
        const data = baseData(org, type, s);
        if (type === "EMARGEMENT" || type === "FEUILLE_EMARGEMENT") data.learners = s.enrollments.map((e) => ({ fullName: `${e.learner.firstName} ${e.learner.lastName}`, company: e.learner.company }));
        documentIds.push(await persistDoc(ctx, type, { sessionId, formationId: s.formationId }, data, templateId, manualOverrides));
      }
    } else {
      if ((PER_LEARNER as readonly string[]).includes(type)) {
        return { error: "Ce type de document nécessite une session avec apprenant(s)." };
      }
      const data = orgOnlyData(org, type);
      documentIds.push(await persistDoc(ctx, type, {}, data, templateId, manualOverrides));
    }
  } catch (e) {
    logger.error("documents.agent_generate_failed", {
      organizationId: ctx.organizationId,
      type,
      sessionId,
      templateId,
      error: e instanceof Error ? e.message : String(e),
    });
    return { error: e instanceof Error ? e.message : "Génération impossible." };
  }

  revalidatePath("/documents");
  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `${documentIds.length} document${documentIds.length > 1 ? "s" : ""} généré${documentIds.length > 1 ? "s" : ""}.`,
    documentIds,
  };
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

/**
 * Dépose un document généré dans Google Drive (archive du centre).
 * Appelé par l'agent : `forClient` sanitise le DOCX (sinon copie interne avec instructions).
 */
export async function uploadDocumentToDrive(input: {
  ctx: TenantContext;
  documentId: string;
  scope?: ConnectorScope;
  folderId?: string;
  forClient?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const { ctx, documentId, scope, folderId, forClient } = input;
  requireRole(ctx, [...EDITORS]);
  const doc = await prisma.document.findFirst({ where: { id: documentId, organizationId: ctx.organizationId } });
  if (!doc || !doc.fileUrl) return { ok: false, error: "Document introuvable." };
  const raw = await readFile(doc.fileUrl);
  const buffer = forClient && isDocxMime(doc.mimeType) ? sanitizeDocxForClient(raw) : raw;
  try {
    await uploadExternalDocumentFile(ctx, {
      connector: "google_drive",
      scope,
      buffer,
      fileName: doc.fileName ?? `${doc.type.toLowerCase()}.${isDocxMime(doc.mimeType) ? "docx" : "pdf"}`,
      mimeType: doc.mimeType ?? "application/pdf",
      folderId,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Dépôt Drive impossible." };
  }
  await auditDocumentEvent(ctx, "document.uploaded_drive", documentId, { type: doc.type, scope: scope ?? "organization", fileName: doc.fileName ?? "" });
  return { ok: true };
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

  const raw = await readFile(doc.fileUrl);
  // Envoi au client final : on retire les instructions/notes de modèle et les marqueurs
  // "[À compléter]" (un DOCX uniquement ; le PDF intégré est déjà propre). Le document
  // stocké (téléchargement interne) reste inchangé.
  const buf = isDocxMime(doc.mimeType) ? sanitizeDocxForClient(raw) : raw;
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
