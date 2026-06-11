import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export function resetTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crée un jeton de réinitialisation si le compte existe (avec mot de passe).
 * Retourne le token en clair (à envoyer par email) ou null. Aucune énumération
 * d'utilisateur n'est exposée à l'appelant côté UI.
 */
export async function createPasswordResetToken(email: string, opts?: { allowNoPassword?: boolean }): Promise<{ token: string; email: string; name: string | null } | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return null;
  // "Mot de passe oublié" classique : on exige un mot de passe existant.
  // Invitation (formateur/bénéficiaire) : on autorise un compte sans mot de passe (allowNoPassword).
  if (!user.passwordHash && !opts?.allowNoPassword) return null;
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: resetTokenHash(token), expiresAt: new Date(Date.now() + EXPIRY_MS) } }),
  ]);
  return { token, email: user.email, name: user.name };
}

/** Consomme un jeton valide et change le mot de passe. Réinitialise le verrou anti-bruteforce. */
export async function consumePasswordReset(token: string, newPassword: string): Promise<{ ok: boolean; reason?: string }> {
  if (!token) return { ok: false, reason: "Lien invalide." };
  if (newPassword.length < 8) return { ok: false, reason: "8 caractères minimum." };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: resetTokenHash(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { ok: false, reason: "Lien expiré ou déjà utilisé." };
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    // Définir le mot de passe vérifie aussi l'email (le clic du lien prouve la possession de l'adresse)
    // et active toute invitation en attente (formateur / bénéficiaire) → accès immédiat après connexion.
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null, emailVerified: new Date() } }),
    prisma.membership.updateMany({ where: { userId: record.userId, status: "INVITED" }, data: { status: "ACTIVE", acceptedAt: new Date() } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return { ok: true };
}
