"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

const EDITORS = ["OWNER", "ADMIN"] as const;

const trainerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: z.string().email("Email invalide.").optional().or(z.literal("")),
  phone: z.string().optional(),
  specialities: z.string().optional(),
  bio: z.string().optional(),
  color: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  active: z.coerce.boolean().optional(),
});

function parse(formData: FormData) {
  return trainerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    specialities: formData.get("specialities") || undefined,
    bio: formData.get("bio") || undefined,
    color: formData.get("color") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
    active: formData.get("active") === "on",
  });
}

function specsToArray(s?: string): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

async function setEligibleFormations(trainerId: string, orgId: string, formationIds: string[]) {
  await prisma.trainerFormation.deleteMany({ where: { trainerId } });
  if (formationIds.length) {
    const valid = await prisma.formation.findMany({ where: { id: { in: formationIds }, organizationId: orgId }, select: { id: true } });
    await prisma.trainerFormation.createMany({ data: valid.map((f) => ({ trainerId, formationId: f.id })), skipDuplicates: true });
  }
}

export async function createTrainer(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const { enforceQuota } = await import("@/server/quota");
  try { await enforceQuota(ctx, "trainers"); } catch (e) { return { error: e instanceof Error ? e.message : "Quota atteint." }; }
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const formationIds = formData.getAll("formationIds").map(String);

  const created = await prisma.trainer.create({
    data: {
      organizationId: ctx.organizationId,
      firstName: d.firstName, lastName: d.lastName,
      initials: (d.firstName[0] + d.lastName[0]).toUpperCase(),
      email: d.email || null, phone: d.phone, specialities: specsToArray(d.specialities),
      bio: d.bio, color: d.color, yearsExperience: d.yearsExperience ?? null, active: d.active ?? true,
    },
  });
  await setEligibleFormations(created.id, ctx.organizationId, formationIds);
  revalidatePath("/formateurs");
  redirect(`/formateurs/${created.id}`);
}

export async function updateTrainer(id: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.trainer.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return { error: "Formateur introuvable." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const formationIds = formData.getAll("formationIds").map(String);

  await prisma.trainer.update({
    where: { id },
    data: {
      firstName: d.firstName, lastName: d.lastName, initials: (d.firstName[0] + d.lastName[0]).toUpperCase(),
      email: d.email || null, phone: d.phone, specialities: specsToArray(d.specialities), bio: d.bio, color: d.color, yearsExperience: d.yearsExperience ?? null, active: d.active ?? true,
    },
  });
  await setEligibleFormations(id, ctx.organizationId, formationIds);
  revalidatePath("/formateurs");
  revalidatePath(`/formateurs/${id}`);
  redirect(`/formateurs/${id}`);
}

export async function deleteTrainer(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.trainer.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.trainer.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  revalidatePath("/formateurs");
  redirect("/formateurs");
}

/**
 * Invite un formateur : crée/relie un compte utilisateur (rôle TRAINER) à sa fiche,
 * afin qu'il accède à son portail `/trainer`. L'email de la fiche est requis.
 * (L'envoi d'email réel se branche dans deliverTrainerInvite ci-dessous.)
 */
export async function inviteTrainer(trainerId: string): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  const trainer = await prisma.trainer.findFirst({ where: { id: trainerId, organizationId: ctx.organizationId } });
  if (!trainer) return { error: "Formateur introuvable." };
  if (!trainer.email) return { error: "Renseignez d'abord l'email du formateur dans sa fiche." };
  const email = trainer.email.toLowerCase();

  // Compte utilisateur (créé si nécessaire)
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, name: `${trainer.firstName} ${trainer.lastName}` } });
  }

  // Lien fiche ↔ compte (userId unique : on relie si la fiche n'est pas déjà liée)
  if (!trainer.userId) {
    const alreadyLinked = await prisma.trainer.findUnique({ where: { userId: user.id } });
    if (!alreadyLinked) await prisma.trainer.update({ where: { id: trainer.id }, data: { userId: user.id } });
  }

  // Membership TRAINER (invitation) dans le centre
  const membership = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: ctx.organizationId } } });
  if (!membership) {
    await prisma.membership.create({
      data: { userId: user.id, organizationId: ctx.organizationId, role: "TRAINER", status: "INVITED", invitedAt: new Date(), invitedEmail: email },
    });
  }

  await deliverTrainerInvite(email, `${trainer.firstName} ${trainer.lastName}`).catch(() => {});
  revalidatePath(`/formateurs/${trainerId}`);
  return { ok: true };
}

/** Placeholder d'envoi d'email d'invitation formateur (branche un vrai email ici). */
async function deliverTrainerInvite(email: string, name: string): Promise<void> {
  try {
    const { sendEmail, brandedEmail } = await import("@/lib/email");
    const { createPasswordResetToken } = await import("@/server/password-reset");
    const base = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    // Lien pour DÉFINIR le mot de passe (active le compte + vérifie l'email + active le membership).
    const reset = await createPasswordResetToken(email, { allowNoPassword: true });
    const url = reset ? `${base}/reset-password?token=${reset.token}` : `${base}/login`;
    await sendEmail({
      to: email,
      subject: "Votre accès formateur Le Bon Rebond — définissez votre mot de passe",
      text: `Bonjour ${name}, un centre de formation vous a invité comme formateur. Définissez votre mot de passe pour accéder à votre portail : ${url}`,
      html: brandedEmail("Invitation formateur", `<p>Bonjour ${name},</p><p>Un centre partenaire vous a invité à gérer vos disponibilités et votre planning sur Le Bon Rebond.</p><p>Cliquez ci-dessous pour <strong>définir votre mot de passe</strong> et accéder à votre portail formateur.</p><p><a href="${url}" style="display:inline-block;padding:11px 16px;background:#1f5f8b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Définir mon mot de passe</a></p>`),
    });
  } catch {
    // Email non configuré : l'invitation reste valable (le formateur pourra définir son mot de passe via "mot de passe oublié").
  }
}
