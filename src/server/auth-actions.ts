"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { brandedEmail, sendEmail } from "@/lib/email";
import { createRegistration, issueVerificationToken } from "@/server/registration";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const loginSchema = z.object({
  email: z.email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis."),
});

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }

  const email = parsed.data.email.toLowerCase();
  const adminAllowlist = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const account = await prisma.user.findUnique({
    where: { email },
    select: {
      platformAdmin: true,
      memberships: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          organization: {
            select: { nbFormationsDeclarees: true, nbFormateursDeclares: true, nbSessionsMois: true, objectifPrincipal: true },
          },
        },
      },
    },
  });
  const organization = account?.memberships[0]?.organization;
  const needsOnboarding = organization
    ? organization.nbFormationsDeclarees == null &&
      organization.nbFormateursDeclares == null &&
      organization.nbSessionsMois == null &&
      organization.objectifPrincipal == null
    : false;

  // Super-admin plateforme (god-mode) : accès direct au tableau de bord plateforme.
  const isAdmin = account?.platformAdmin === true || adminAllowlist.includes(email);
  const destination = isAdmin ? "/admin" : needsOnboarding ? "/onboarding" : "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: destination,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Identifiants incorrects." };
    }
    throw e; // NEXT_REDIRECT doit se propager
  }
  return { ok: true };
}

const registerSchema = z.object({
  name: z.string().min(2, "Votre nom est requis."),
  centerName: z.string().min(2, "Le nom du centre est requis."),
  email: z.email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  terms: z.literal("on", { error: "Vous devez accepter les conditions d'utilisation." }),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

async function deliverVerificationEmail(email: string, name: string, token: string) {
  const baseUrl = process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name);
  await sendEmail({
    to: email,
    subject: "Confirmez votre email RebondPro",
    text: `Bonjour ${name}, confirmez votre email : ${verifyUrl}`,
    html: brandedEmail(
      "Confirmez votre adresse email",
      `<p>Bonjour ${safeName},</p><p>Validez votre adresse pour activer votre cockpit RebondPro.</p><p><a href="${verifyUrl}" style="display:inline-block;padding:11px 16px;background:#5850ec;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Confirmer mon email</a></p><p>Ce lien expire dans 24 heures.</p>`,
    ),
  });
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    centerName: formData.get("centerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  }
  const { name, centerName, email, password } = parsed.data;

  let registration: Awaited<ReturnType<typeof createRegistration>>;
  try {
    registration = await createRegistration({ name, centerName, email, password });
  } catch (error) {
    if (error instanceof Error && error.message === "REGISTRATION_EMAIL_EXISTS") {
      return { error: "Un compte existe déjà avec cet email." };
    }
    throw error;
  }
  const { user, token } = registration;

  try {
    await deliverVerificationEmail(user.email, user.name ?? "bonjour", token);
  } catch (error) {
    console.error("[auth] verification delivery failed", { userId: user.id, error });
    redirect(`/check-email?email=${encodeURIComponent(user.email)}&delivery=failed`);
  }
  redirect(`/check-email?email=${encodeURIComponent(user.email)}`);
}

export async function resendVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.email() }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Email invalide." };
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.emailVerified) return { ok: true };
  try {
    const token = await issueVerificationToken(user.id);
    await deliverVerificationEmail(user.email, user.name ?? "bonjour", token);
    return { ok: true };
  } catch (error) {
    console.error("[auth] verification resend failed", { userId: user.id, error });
    return { error: "L'email n'a pas pu être envoyé. Réessayez dans quelques instants." };
  }
}

// ── Réinitialisation du mot de passe ──────────────────────────────
async function deliverResetEmail(email: string, name: string | null, token: string) {
  const baseUrl = process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(name ?? "bonjour");
  await sendEmail({
    to: email,
    subject: "Réinitialisez votre mot de passe RebondPro",
    text: `Bonjour ${name ?? ""}, réinitialisez votre mot de passe : ${resetUrl}`,
    html: brandedEmail(
      "Réinitialisation du mot de passe",
      `<p>Bonjour ${safeName},</p><p>Vous avez demandé à réinitialiser votre mot de passe.</p><p><a href="${resetUrl}" style="display:inline-block;padding:11px 16px;background:#5850ec;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">Choisir un nouveau mot de passe</a></p><p>Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    ),
  });
}

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email: z.email("Email invalide.") }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Email invalide." };
  const { createPasswordResetToken } = await import("@/server/password-reset");
  try {
    const result = await createPasswordResetToken(parsed.data.email);
    if (result) await deliverResetEmail(result.email, result.name, result.token);
  } catch (error) {
    console.error("[auth] password reset delivery failed", { error });
    // On ne révèle pas l'échec : réponse identique pour éviter l'énumération.
  }
  // Réponse volontairement identique que le compte existe ou non.
  return { ok: true };
}

const resetSchema = z.object({
  token: z.string().min(1, "Lien invalide."),
  password: z.string().min(8, "8 caractères minimum."),
});

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetSchema.safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { consumePasswordReset } = await import("@/server/password-reset");
  const result = await consumePasswordReset(parsed.data.token, parsed.data.password);
  if (!result.ok) return { error: result.reason ?? "Réinitialisation impossible." };
  redirect("/login?reset=ok");
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
