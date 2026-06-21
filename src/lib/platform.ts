import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type PlatformAdmin = { userId: string; email: string | null; name: string | null };

function envAllowlist(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/** L'utilisateur courant est-il super-admin plateforme ? (flag DB OU allowlist env). */
export async function getPlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;
  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, name: true, platformAdmin: true } });
    if (!user) return null;
    const allowed = user.platformAdmin || (user.email ? envAllowlist().includes(user.email.toLowerCase()) : false);
    if (!allowed) return null;
    return { userId: user.id, email: user.email, name: user.name };
  } catch {
    // Colonne platformAdmin pas encore migrée (ou DB indisponible) : fallback sur l'allowlist env seule.
    const email = session.user.email?.toLowerCase();
    if (email && envAllowlist().includes(email)) return { userId: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null };
    return null;
  }
}

export async function isPlatformAdmin(): Promise<boolean> {
  return (await getPlatformAdmin()) !== null;
}

/** Garde-fou : exige le rôle super-admin plateforme. Redirige sinon. */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/login?space=admin&next=/admin");
  return admin;
}
