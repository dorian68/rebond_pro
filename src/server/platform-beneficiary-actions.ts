"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { createBeneficiaryInternal } from "@/server/beneficiary-actions";
import { getPlatformBeneficiaryOrganization } from "@/server/platform-beneficiary-org";
import type { FormActionState } from "@/server/formations-actions";
import type { Prisma } from "@prisma/client";

const statusSchema = z.enum(["active", "completed", "archived"]);
const stepStatusSchema = z.enum(["todo", "in_progress", "done"]);

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
