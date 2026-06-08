import { prisma } from "@/lib/prisma";

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

/** Le compte est-il verrouillé suite à trop d'échecs ? */
export function isLocked(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

/** Enregistre un échec de connexion ; verrouille au-delà du seuil. */
export async function recordFailedLogin(userId: string): Promise<{ locked: boolean; remaining: number }> {
  const u = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (u.failedLoginCount >= MAX_ATTEMPTS) {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000), failedLoginCount: 0 },
    });
    return { locked: true, remaining: 0 };
  }
  return { locked: false, remaining: MAX_ATTEMPTS - u.failedLoginCount };
}

/** Réinitialise le compteur après une connexion réussie. */
export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}
