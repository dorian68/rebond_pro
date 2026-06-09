"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

async function currentBeneficiary() {
  const ctx = await requireTenant();
  const beneficiary = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId } });
  return { ctx, beneficiary };
}

// ── Profil ────────────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  objective: z.string().optional(),
  situation: z.string().optional(),
});

export async function updateMyBeneficiaryProfile(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const { beneficiary } = await currentBeneficiary();
  if (!beneficiary) return { error: "Aucun espace bénéficiaire lié à votre compte." };
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined, objective: formData.get("objective") || undefined, situation: formData.get("situation") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  await prisma.beneficiary.update({ where: { id: beneficiary.id }, data: parsed.data });
  revalidatePath("/espace/profil");
  return { ok: true };
}

// ── Parcours (étapes du bilan) ────────────────────────────────────
export async function setBilanStepStatus(stepId: string, status: "todo" | "in_progress" | "done"): Promise<void> {
  const { beneficiary } = await currentBeneficiary();
  if (!beneficiary) return;
  await prisma.bilanStep.updateMany({
    where: { id: stepId, beneficiaryId: beneficiary.id },
    data: { status, completedAt: status === "done" ? new Date() : null },
  });
  revalidatePath("/espace/parcours");
  revalidatePath("/espace");
}

export async function saveBilanStepNotes(stepId: string, notes: string): Promise<void> {
  const { beneficiary } = await currentBeneficiary();
  if (!beneficiary) return;
  await prisma.bilanStep.updateMany({ where: { id: stepId, beneficiaryId: beneficiary.id }, data: { notes: notes.slice(0, 2000) } });
  revalidatePath("/espace/parcours");
}

// ── Catalogue : intérêts ──────────────────────────────────────────
/** Enregistre / retire une formation du catalogue dans "mes formations". */
export async function toggleFormationInterest(formationId: string): Promise<{ saved: boolean }> {
  const { beneficiary } = await currentBeneficiary();
  if (!beneficiary) return { saved: false };
  const existing = await prisma.formationInterest.findUnique({ where: { beneficiaryId_formationId: { beneficiaryId: beneficiary.id, formationId } } });
  if (existing) {
    await prisma.formationInterest.delete({ where: { id: existing.id } });
    revalidatePath("/espace/catalogue"); revalidatePath("/espace");
    return { saved: false };
  }
  // Vérifie que la formation est bien publique
  const f = await prisma.formation.findFirst({ where: { id: formationId, isPublic: true, status: "PUBLIE", deletedAt: null } });
  if (!f) return { saved: false };
  await prisma.formationInterest.create({ data: { beneficiaryId: beneficiary.id, formationId, status: "saved" } });
  revalidatePath("/espace/catalogue"); revalidatePath("/espace");
  return { saved: true };
}

/** Demande d'informations sur une formation : marque l'intérêt + crée un prospect dans le centre concerné. */
export async function requestFormationInfo(formationId: string): Promise<FormActionState> {
  const { beneficiary } = await currentBeneficiary();
  if (!beneficiary) return { error: "Aucun espace bénéficiaire lié à votre compte." };
  const f = await prisma.formation.findFirst({ where: { id: formationId, isPublic: true, status: "PUBLIE", deletedAt: null }, select: { id: true, title: true, price: true, organizationId: true } });
  if (!f) return { error: "Formation indisponible." };

  // Intérêt marqué "requested"
  await prisma.formationInterest.upsert({
    where: { beneficiaryId_formationId: { beneficiaryId: beneficiary.id, formationId } },
    create: { beneficiaryId: beneficiary.id, formationId, status: "requested" },
    update: { status: "requested" },
  });

  // Prospect créé dans le centre propriétaire de la formation (relie B2C → CRM B2B)
  const email = beneficiary.email ?? undefined;
  const existingProspect = email ? await prisma.prospect.findFirst({ where: { organizationId: f.organizationId, formationOfInterestId: f.id, email, deletedAt: null, stage: { notIn: ["GAGNE", "PERDU"] } } }) : null;
  if (!existingProspect) {
    await prisma.prospect.create({
      data: {
        organizationId: f.organizationId, formationOfInterestId: f.id,
        name: `${beneficiary.firstName} ${beneficiary.lastName}`, contactName: `${beneficiary.firstName} ${beneficiary.lastName}`,
        type: "PARTICULIER", email: email ?? null, phone: beneficiary.phone,
        source: "PAGE_PUBLIQUE", stage: "NOUVEAU", potentialAmount: f.price,
        nextAction: "Recontacter (demande depuis espace bénéficiaire)", nextFollowUpDate: new Date(), isHot: true,
        notes: `Demande d'informations depuis l'espace bilan de compétences pour « ${f.title} ».`,
      },
    });
  }
  revalidatePath("/espace/catalogue");
  return { ok: true };
}
