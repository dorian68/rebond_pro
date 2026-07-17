"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { sendEmail, brandedEmail } from "@/lib/email";
import { createBeneficiaryInternal } from "@/server/beneficiary-actions";
import { getPlatformBeneficiaryOrganization } from "@/server/platform-beneficiary-org";
import { getBilanProgram, parseBilanProgramId } from "@/lib/bilan-programs";
import { renderBeneficiaryDossierPdf } from "@/server/pdf/beneficiary-dossier";
import type { FormActionState } from "@/server/formations-actions";
import { DocumentStatus, DocumentType, type Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

const statusSchema = z.enum(["active", "completed", "archived"]);
const stepStatusSchema = z.enum(["todo", "in_progress", "done"]);
const dossierDocumentType = DocumentType.DOSSIER_NUMERIQUE_EXPORTABLE;

export async function updatePlatformBeneficiaryStatus(id: string, status: "active" | "completed" | "archived"): Promise<void> {
  const admin = await requirePlatformAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return;
  const existing = await prisma.beneficiary.findUnique({ where: { id }, select: { id: true, organizationId: true, status: true } });
  if (!existing) return;
  await prisma.beneficiary.update({ where: { id }, data: { status: parsed.data } });
  await prisma.auditLog.create({
    data: {
      organizationId: existing.organizationId,
      actorId: admin.userId,
      action: "platform.beneficiary.status_update",
      entityType: "Beneficiary",
      entityId: id,
      before: { status: existing.status },
      after: { status: parsed.data },
    },
  });
  revalidatePath("/admin/beneficiaires");
  revalidatePath(`/admin/beneficiaires/${id}`);
}

export async function updatePlatformBilanStep(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = z.object({
    stepId: z.string().min(1),
    beneficiaryId: z.string().min(1),
    status: stepStatusSchema,
    notes: z.string().max(8000).optional(),
  }).safeParse({
    stepId: formData.get("stepId"),
    beneficiaryId: formData.get("beneficiaryId"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Étape invalide." };
  const step = await prisma.bilanStep.findFirst({
    where: { id: parsed.data.stepId, beneficiaryId: parsed.data.beneficiaryId },
    include: { beneficiary: { select: { organizationId: true } } },
  });
  if (!step) return { error: "Étape introuvable." };
  await prisma.bilanStep.update({
    where: { id: step.id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      completedAt: parsed.data.status === "done" ? new Date() : null,
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: step.beneficiary.organizationId,
      actorId: admin.userId,
      action: "platform.bilan_step.update",
      entityType: "BilanStep",
      entityId: step.id,
      before: { status: step.status, notes: step.notes },
      after: { status: parsed.data.status, notes: parsed.data.notes },
    },
  });
  revalidatePath(`/admin/beneficiaires/${parsed.data.beneficiaryId}`);
  return { ok: true };
}

const artifactStatusSchema = z.enum(["draft", "validated", "shareable", "archived"]);

export async function savePlatformBilanArtifact(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = z.object({
    beneficiaryId: z.string().min(1),
    stepId: z.string().min(1),
    key: z.string().min(1).max(80),
    kind: z.string().min(1).max(40),
    title: z.string().min(1).max(140),
    status: artifactStatusSchema.default("draft"),
    shareable: z.boolean().default(false),
    content: z.string().min(2).max(20000),
    notes: z.string().max(8000).optional(),
  }).safeParse({
    beneficiaryId: formData.get("beneficiaryId"),
    stepId: formData.get("stepId"),
    key: formData.get("key"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    status: formData.get("status") || "draft",
    shareable: formData.get("shareable") === "true",
    content: formData.get("content"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Artefact invalide." };

  let content: Prisma.InputJsonValue;
  try {
    content = JSON.parse(parsed.data.content) as Prisma.InputJsonValue;
  } catch {
    return { error: "Contenu JSON invalide." };
  }

  const step = await prisma.bilanStep.findFirst({
    where: { id: parsed.data.stepId, beneficiaryId: parsed.data.beneficiaryId },
    include: { beneficiary: { select: { organizationId: true } } },
  });
  if (!step) return { error: "Étape introuvable." };

  const previous = await prisma.bilanArtifact.findUnique({
    where: { beneficiaryId_key: { beneficiaryId: parsed.data.beneficiaryId, key: parsed.data.key } },
  });

  const artifact = await prisma.bilanArtifact.upsert({
    where: { beneficiaryId_key: { beneficiaryId: parsed.data.beneficiaryId, key: parsed.data.key } },
    create: {
      beneficiaryId: parsed.data.beneficiaryId,
      stepId: parsed.data.stepId,
      key: parsed.data.key,
      kind: parsed.data.kind,
      title: parsed.data.title,
      status: parsed.data.status,
      shareable: parsed.data.shareable,
      content,
      source: "admin",
    },
    update: {
      stepId: parsed.data.stepId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      status: parsed.data.status,
      shareable: parsed.data.shareable,
      content,
      source: "admin",
    },
  });

  const stepStatus = parsed.data.status === "validated" || parsed.data.status === "shareable" ? "done" : "in_progress";
  await prisma.bilanStep.update({
    where: { id: step.id },
    data: {
      status: stepStatus,
      notes: parsed.data.notes ?? step.notes,
      completedAt: stepStatus === "done" ? new Date() : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: step.beneficiary.organizationId,
      actorId: admin.userId,
      action: "platform.bilan_artifact.upsert",
      entityType: "BilanArtifact",
      entityId: artifact.id,
      before: previous ? { status: previous.status, content: previous.content } : undefined,
      after: { key: artifact.key, kind: artifact.kind, status: artifact.status, shareable: artifact.shareable },
    },
  });
  revalidatePath(`/admin/beneficiaires/${parsed.data.beneficiaryId}`);
  return { ok: true };
}

export async function setPlatformBeneficiaryProgram(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = z.object({
    beneficiaryId: z.string().min(1),
    programId: z.string().min(1),
  }).safeParse({
    beneficiaryId: formData.get("beneficiaryId"),
    programId: formData.get("programId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Parcours invalide." };

  const programId = parseBilanProgramId(parsed.data.programId);
  const beneficiary = await prisma.beneficiary.findUnique({ where: { id: parsed.data.beneficiaryId }, select: { id: true, organizationId: true } });
  if (!beneficiary) return { error: "Bénéficiaire introuvable." };
  const program = getBilanProgram(programId);
  const updatedAt = new Date().toISOString();

  const previous = await prisma.bilanArtifact.findUnique({
    where: { beneficiaryId_key: { beneficiaryId: beneficiary.id, key: "prestation-program" } },
  });
  const artifact = await prisma.bilanArtifact.upsert({
    where: { beneficiaryId_key: { beneficiaryId: beneficiary.id, key: "prestation-program" } },
    create: {
      beneficiaryId: beneficiary.id,
      key: "prestation-program",
      kind: "program",
      title: "Modèle de prestation",
      status: "validated",
      shareable: false,
      source: "admin",
      content: { programId, label: program.label, sourcePdf: program.sourcePdf, updatedAt },
    },
    update: {
      status: "validated",
      source: "admin",
      content: { programId, label: program.label, sourcePdf: program.sourcePdf, updatedAt },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: beneficiary.organizationId,
      actorId: admin.userId,
      action: "platform.beneficiary.program_set",
      entityType: "BilanArtifact",
      entityId: artifact.id,
      before: previous ? { content: previous.content } : undefined,
      after: { programId, label: program.label, sourcePdf: program.sourcePdf },
    },
  });
  revalidatePath("/admin/beneficiaires");
  revalidatePath(`/admin/beneficiaires/${beneficiary.id}`);
  return { ok: true };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nowText(): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date());
}

async function buildPlatformBeneficiaryDossierData(beneficiaryId: string) {
  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: beneficiaryId },
    include: {
      organization: { select: { id: true, name: true } },
      steps: { orderBy: { order: "asc" } },
      artifacts: { orderBy: { updatedAt: "desc" } },
    },
  });
  if (!beneficiary) return null;

  const programArtifact = beneficiary.artifacts.find((artifact) => artifact.key === "prestation-program");
  const programId = parseBilanProgramId(jsonObject(programArtifact?.content).programId);
  const program = getBilanProgram(programId);
  const roadmapTitles = new Set(program.steps.map((step) => step.title));
  const orderedSteps = beneficiary.steps
    .filter((step) => roadmapTitles.has(step.title))
    .sort((a, b) => {
      const ai = program.steps.findIndex((step) => step.title === a.title);
      const bi = program.steps.findIndex((step) => step.title === b.title);
      return ai - bi;
    });

  return {
    beneficiary,
    programId,
    program,
    data: {
      organizationName: beneficiary.organization.name,
      beneficiary: {
        firstName: beneficiary.firstName,
        lastName: beneficiary.lastName,
        email: beneficiary.email,
        phone: beneficiary.phone,
        objective: beneficiary.objective,
        status: beneficiary.status,
        startedAt: beneficiary.startedAt,
      },
      program,
      generatedAt: nowText(),
      steps: orderedSteps.map((step) => ({
        id: step.id,
        title: step.title,
        phase: step.phase,
        status: step.status,
        notes: step.notes,
      })),
      artifacts: beneficiary.artifacts
        .filter((artifact) => artifact.key !== "prestation-program")
        .map((artifact) => ({
          key: artifact.key,
          title: artifact.title,
          kind: artifact.kind,
          status: artifact.status,
          shareable: artifact.shareable,
          content: artifact.content,
        })),
    },
  };
}

export async function renderPlatformBilanDossierPdf(beneficiaryId: string): Promise<{ buffer: Buffer; fileName: string } | null> {
  await requirePlatformAdmin();
  const dossier = await buildPlatformBeneficiaryDossierData(beneficiaryId);
  if (!dossier) return null;
  const buffer = await renderBeneficiaryDossierPdf(dossier.data);
  const safeName = `${dossier.beneficiary.firstName}-${dossier.beneficiary.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "beneficiaire";
  return { buffer, fileName: `dossier-prestation-${safeName}.pdf` };
}

async function createPlatformBeneficiaryDossierDocument(beneficiaryId: string, actorId: string) {
  const dossier = await buildPlatformBeneficiaryDossierData(beneficiaryId);
  if (!dossier) return { ok: false as const, error: "Bénéficiaire introuvable." };
  const { beneficiary, program, programId, data } = dossier;
  const buffer = await renderBeneficiaryDossierPdf(data);
  if (buffer.length < 512) return { ok: false as const, error: "PDF généré vide." };

  const fileId = randomUUID();
  const safeName = `${beneficiary.firstName}-${beneficiary.lastName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "beneficiaire";
  const fileName = `dossier-prestation-${safeName}-${fileId}.pdf`;
  const key = `documents/${beneficiary.organizationId}/${fileName}`;
  await saveFile(key, buffer);

  const doc = await prisma.document.create({
    data: {
      organizationId: beneficiary.organizationId,
      type: dossierDocumentType,
      status: DocumentStatus.GENERE,
      generatedAt: new Date(),
      fileUrl: key,
      fileName,
      mimeType: "application/pdf",
      manualOverrides: { beneficiaryId: beneficiary.id, programId, source: "platform-beneficiary-dossier" },
      generationContextSnapshot: {
        beneficiaryId: beneficiary.id,
        programId,
        steps: data.steps.length,
        artifacts: beneficiary.artifacts.length,
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: beneficiary.organizationId,
      actorId,
      action: "platform.beneficiary.dossier_pdf_generated",
      entityType: "Document",
      entityId: doc.id,
      after: { beneficiaryId: beneficiary.id, programId, fileName, bytes: buffer.length },
    },
  });
  return { ok: true as const, document: doc, buffer, beneficiary, program };
}

export async function generatePlatformBeneficiaryDossier(beneficiaryId: string, prev: FormActionState, formData: FormData): Promise<FormActionState> {
  void prev;
  void formData;
  const admin = await requirePlatformAdmin();
  const result = await createPlatformBeneficiaryDossierDocument(beneficiaryId, admin.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin");
  revalidatePath("/admin/beneficiaires");
  revalidatePath(`/admin/beneficiaires/${beneficiaryId}`);
  return { ok: true };
}

export async function sendPlatformBeneficiaryDossier(beneficiaryId: string, prev: FormActionState, formData: FormData): Promise<FormActionState> {
  void prev;
  void formData;
  const admin = await requirePlatformAdmin();
  const result = await createPlatformBeneficiaryDossierDocument(beneficiaryId, admin.userId);
  if (!result.ok) return { error: result.error };
  const to = result.beneficiary.email;
  if (!to) return { error: "Aucun email bénéficiaire renseigné." };
  const fullName = `${result.beneficiary.firstName} ${result.beneficiary.lastName}`.trim();
  await sendEmail({
    to,
    subject: `Votre dossier d'accompagnement - ${result.program.label}`,
    html: brandedEmail(
      "Votre dossier d'accompagnement",
      `<p>Bonjour ${fullName},</p><p>Vous trouverez en pièce jointe votre dossier numérique de prestation Le Bon Rebond.</p><p>Ce document reprend les éléments saisis pendant l'accompagnement et peut être imprimé ou conservé pour votre suivi.</p>`,
    ),
    text: `Bonjour ${fullName},\n\nVous trouverez en pièce jointe votre dossier numérique de prestation Le Bon Rebond.`,
    attachments: [{ filename: result.document.fileName ?? "dossier-prestation.pdf", content: result.buffer }],
  });
  await prisma.document.update({ where: { id: result.document.id }, data: { status: DocumentStatus.ENVOYE, sentAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      organizationId: result.beneficiary.organizationId,
      actorId: admin.userId,
      action: "platform.beneficiary.dossier_pdf_sent",
      entityType: "Document",
      entityId: result.document.id,
      after: { beneficiaryId, to, fileName: result.document.fileName },
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/beneficiaires");
  revalidatePath(`/admin/beneficiaires/${beneficiaryId}`);
  return { ok: true };
}

const transferSchema = z.object({
  targetOrganizationId: z.string().min(1, "Centre cible requis."),
});

export async function transferBeneficiaryToCenter(beneficiaryId: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const admin = await requirePlatformAdmin();
  const parsed = transferSchema.safeParse({ targetOrganizationId: formData.get("targetOrganizationId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Centre cible invalide." };

  const beneficiary = await prisma.beneficiary.findUnique({
    where: { id: beneficiaryId },
    include: {
      organization: { select: { id: true, name: true } },
      user: { select: { id: true, email: true, emailVerified: true } },
      steps: { select: { status: true } },
      interests: { include: { formation: { select: { id: true, title: true, organizationId: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!beneficiary) return { error: "Bénéficiaire introuvable." };
  const target = await prisma.organization.findFirst({ where: { id: parsed.data.targetOrganizationId, deletedAt: null }, select: { id: true, name: true } });
  if (!target) return { error: "Centre cible introuvable." };
  if (target.id === beneficiary.organizationId) return { error: "Le bénéficiaire appartient déjà à ce centre." };

  const previousOrganizationId = beneficiary.organizationId;
  const total = beneficiary.steps.length;
  const done = beneficiary.steps.filter((s) => s.status === "done").length;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const targetFormation = beneficiary.interests.find((i) => i.formation.organizationId === target.id)?.formation ?? null;
  const fullName = `${beneficiary.firstName} ${beneficiary.lastName}`.trim();

  try {
    await prisma.$transaction(async (tx) => {
    await tx.beneficiary.update({ where: { id: beneficiary.id }, data: { organizationId: target.id } });

    if (beneficiary.userId) {
      await tx.membership.updateMany({
        where: { userId: beneficiary.userId, organizationId: previousOrganizationId, role: "LEARNER", status: "ACTIVE" },
        data: { status: "SUSPENDED" },
      });
      const existingMembership = await tx.membership.findUnique({
        where: { userId_organizationId: { userId: beneficiary.userId, organizationId: target.id } },
      });
      if (existingMembership) {
        if (existingMembership.role === "LEARNER") {
          await tx.membership.update({
            where: { id: existingMembership.id },
            data: { status: "ACTIVE", acceptedAt: new Date() },
          });
        } else if (existingMembership.status !== "ACTIVE") {
          throw new Error("TARGET_MEMBERSHIP_CONFLICT");
        }
      } else {
        await tx.membership.create({
          data: {
            userId: beneficiary.userId,
            organizationId: target.id,
            role: "LEARNER",
            status: "ACTIVE",
            acceptedAt: new Date(),
            invitedEmail: beneficiary.email ?? beneficiary.user?.email ?? undefined,
          },
        });
      }
    }

    const existingProspect = beneficiary.email
      ? await tx.prospect.findFirst({ where: { organizationId: target.id, deletedAt: null, email: beneficiary.email } })
      : null;
    const notes = [
      `Dossier bilan transféré par l'administration plateforme depuis ${beneficiary.organization.name}.`,
      `Progression bilan: ${progress}% (${done}/${total} étapes).`,
      beneficiary.objective ? `Objectif: ${beneficiary.objective}` : null,
      targetFormation ? `Formation d'intérêt: ${targetFormation.title}` : null,
    ].filter(Boolean).join("\n");
    if (existingProspect) {
      await tx.prospect.update({
        where: { id: existingProspect.id },
        data: {
          name: fullName || existingProspect.name,
          contactName: fullName || existingProspect.contactName,
          phone: beneficiary.phone ?? existingProspect.phone,
          formationOfInterestId: targetFormation?.id ?? existingProspect.formationOfInterestId,
          source: "RECOMMANDATION",
          stage: existingProspect.stage === "PERDU" ? "NOUVEAU" : existingProspect.stage,
          notes: [existingProspect.notes, notes].filter(Boolean).join("\n\n"),
        },
      });
    } else {
      await tx.prospect.create({
        data: {
          organizationId: target.id,
          name: fullName || beneficiary.email || "Bénéficiaire transféré",
          contactName: fullName || undefined,
          type: "PARTICULIER",
          email: beneficiary.email,
          phone: beneficiary.phone,
          formationOfInterestId: targetFormation?.id ?? null,
          source: "RECOMMANDATION",
          stage: "NOUVEAU",
          isHot: true,
          notes,
        },
      });
    }

    await tx.auditLog.createMany({
      data: [
        {
          organizationId: previousOrganizationId,
          actorId: admin.userId,
          action: "platform.beneficiary.transfer_out",
          entityType: "Beneficiary",
          entityId: beneficiary.id,
          before: { organizationId: previousOrganizationId, organizationName: beneficiary.organization.name },
          after: { organizationId: target.id, organizationName: target.name },
        },
        {
          organizationId: target.id,
          actorId: admin.userId,
          action: "platform.beneficiary.transfer_in",
          entityType: "Beneficiary",
          entityId: beneficiary.id,
          before: { organizationId: previousOrganizationId, organizationName: beneficiary.organization.name },
          after: { organizationId: target.id, organizationName: target.name, prospectCreatedOrUpdated: true },
        },
      ],
    });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TARGET_MEMBERSHIP_CONFLICT") {
      return { error: "Ce compte possède déjà un accès non bénéficiaire suspendu dans le centre cible. Réactivez ou corrigez cet accès avant migration." };
    }
    throw error;
  }

  revalidatePath("/admin/beneficiaires");
  revalidatePath(`/admin/beneficiaires/${beneficiary.id}`);
  revalidatePath(`/admin/centres/${previousOrganizationId}`);
  revalidatePath(`/admin/centres/${target.id}`);
  revalidatePath("/prospects");
  return { ok: true };
}

const platformInviteSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: z.string().email("Email invalide."),
  phone: z.string().optional(),
  objective: z.string().optional(),
});

export async function invitePlatformBeneficiary(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  await requirePlatformAdmin();
  const parsed = platformInviteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    objective: formData.get("objective") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const holdingOrg = await getPlatformBeneficiaryOrganization();
  const result = await createBeneficiaryInternal(holdingOrg.id, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/beneficiaires");
  return { ok: true };
}
