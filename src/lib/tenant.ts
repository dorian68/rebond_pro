import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Role } from "@prisma/client";

/**
 * Auto-login DEV : si DEV_AUTOLOGIN=true (dans .env.local), l'app considère
 * l'utilisateur comme connecté sans passer par l'écran de login.
 * ⚠️ Strictement réservé au développement/local. Ne JAMAIS activer en production.
 */
async function devAutoSession(): Promise<Session | null> {
  if (process.env.NODE_ENV === "production") return null;
  const email = process.env.DEV_AUTOLOGIN_EMAIL?.toLowerCase();
  const membership = await prisma.membership.findFirst({
    where: { status: "ACTIVE", ...(email ? { user: { email } } : {}) },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }], // OWNER ('OWNER' < autres ? non) — on filtre ci-dessous
    include: { user: true, organization: true },
  });
  // Préférence : un OWNER si disponible (sinon le premier membre actif)
  const owner = email
    ? membership
    : await prisma.membership.findFirst({ where: { status: "ACTIVE", role: "OWNER" }, orderBy: { createdAt: "asc" }, include: { user: true, organization: true } });
  const m = owner ?? membership;
  if (!m) return null;
  return {
    user: {
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as unknown as Session;
}

export type TenantContext = {
  userId: string;
  email: string | null;
  name: string | null;
  organizationId: string;
  organizationName: string | null;
  organizationSlug: string | null;
  role: Role;
};

const getActiveMembershipForUser = cache(async (userId: string) => {
  return prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", organization: { deletedAt: null } },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });
});

/** Session brute (peut être null). Mémoïsée par rendu. */
export const getSession = cache(async () => {
  if (process.env.DEV_AUTOLOGIN === "true") {
    const dev = await devAutoSession();
    if (dev) return dev;
  }
  return auth();
});

/**
 * Contexte tenant obligatoire. Redirige vers /login si non authentifié,
 * vers /onboarding si l'utilisateur n'a pas encore d'organisation.
 * À appeler en tête de CHAQUE page/action/route protégée.
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const u = session.user;
  const membership = await getActiveMembershipForUser(u.id);
  if (membership) {
    if (!u.organizationId || u.organizationId !== membership.organizationId || u.role !== membership.role) {
      logger.warn("tenant.session_stale_resolved_from_db", {
        userId: u.id,
        tokenOrganizationId: u.organizationId ?? null,
        dbOrganizationId: membership.organizationId,
        tokenRole: u.role ?? null,
        dbRole: membership.role,
      });
    }
    return {
      userId: u.id,
      email: u.email ?? null,
      name: u.name ?? null,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role: membership.role,
    };
  }

  if (!u.organizationId) redirect("/login");

  return {
    userId: u.id,
    email: u.email ?? null,
    name: u.name ?? null,
    organizationId: u.organizationId,
    organizationName: u.organizationName,
    organizationSlug: u.organizationSlug,
    role: (u.role as Role) ?? "ASSISTANT",
  };
}

/** Vérifie que le rôle courant fait partie des rôles autorisés. */
export function assertRole(ctx: TenantContext, allowed: Role[]): boolean {
  return allowed.includes(ctx.role);
}

/** Lève (403 logique) si le rôle n'est pas autorisé. */
export function requireRole(ctx: TenantContext, allowed: Role[]): void {
  if (!assertRole(ctx, allowed)) {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Filtre tenant à fusionner dans CHAQUE requête Prisma sur une entité métier.
 * Ex : prisma.formation.findMany({ where: { ...tenantWhere(ctx) } })
 */
export function tenantWhere(ctx: TenantContext) {
  return { organizationId: ctx.organizationId } as const;
}
