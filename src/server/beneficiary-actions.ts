"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import { DEFAULT_BILAN_STEPS } from "@/server/bilan";
import type { FormActionState } from "@/server/formations-actions";

const STAFF = ["OWNER", "ADMIN", "ASSISTANT"] as const;

const inviteSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  email: z.string().email("Email invalide."),
  phone: z.string().optional(),
  objective: z.string().optional(),
});

/** Crée un bénéficiaire, lui ouvre un compte (rôle LEARNER) et initialise son parcours de bilan. */
export async function inviteBeneficiary(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...STAFF]);
  const parsed = inviteSchema.safeParse({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"),
    email: formData.get("email"), phone: formData.get("phone") || undefined, objective: formData.get("objective") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  // Compte utilisateur
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email, name: `${d.firstName} ${d.lastName}` } });

  // Un user = un bénéficiaire (userId unique)
  const existingBen = await prisma.beneficiary.findUnique({ where: { userId: user.id } });
  if (existingBen) return { error: "Un bénéficiaire existe déjà pour cet email." };

  await prisma.beneficiary.create({
    data: {
      organizationId: ctx.organizationId, userId: user.id, firstName: d.firstName, lastName: d.lastName,
      email, phone: d.phone, objective: d.objective, status: "active",
      steps: { create: DEFAULT_BILAN_STEPS.map((s, i) => ({ phase: s.phase, title: s.title, description: s.description, order: i })) },
    },
  });

  // Membership LEARNER (accès espace personnel)
  const membership = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: ctx.organizationId } } });
  if (!membership) {
    await prisma.membership.create({ data: { userId: user.id, organizationId: ctx.organizationId, role: "LEARNER", status: "INVITED", invitedAt: new Date(), invitedEmail: email } });
  }

  await deliverBeneficiaryInvite(email, `${d.firstName} ${d.lastName}`).catch(() => {});
  revalidatePath("/beneficiaires");
  return { ok: true, error: undefined } as FormActionState;
}

export async function updateBeneficiaryStatus(id: string, status: "active" | "completed" | "archived"): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...STAFF]);
  await prisma.beneficiary.updateMany({ where: { id, organizationId: ctx.organizationId }, data: { status } });
  revalidatePath("/beneficiaires");
  revalidatePath(`/beneficiaires/${id}`);
}

async function deliverBeneficiaryInvite(email: string, name: string): Promise<void> {
  try {
    const { sendEmail, brandedEmail } = await import("@/lib/email");
    const { createPasswordResetToken } = await import("@/server/password-reset");
    const base = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const reset = await createPasswordResetToken(email, { allowNoPassword: true });
    const url = reset ? `${base}/reset-password?token=${reset.token}` : `${base}/login`;
    await sendEmail({
      to: email,
      subject: "Votre espace bilan Le Bon Rebond — définissez votre mot de passe",
      text: `Bonjour ${name}, votre espace personnel d'accompagnement est prêt. Définissez votre mot de passe pour y accéder : ${url}`,
      html: brandedEmail("Votre espace personnel", `<p>Bonjour ${name},</p><p>Votre accompagnement en bilan de compétences commence. Cliquez ci-dessous pour <strong>définir votre mot de passe</strong> et accéder à votre espace (suivi de parcours, catalogue de formations).</p><p><a href="${url}" style="display:inline-block;padding:11px 16px;background:#2469a6;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Définir mon mot de passe</a></p>`),
    });
  } catch { /* email non configuré : l'invitation reste valable */ }
}
