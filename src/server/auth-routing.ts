import "server-only";
import { prisma } from "@/lib/prisma";

export type AuthSpace = "client" | "centre" | "admin";

function envAdminAllowlist(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function safeRelativePath(path?: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (/[\\\r\n]/.test(path)) return null;
  return path;
}

export function safeAdminRedirect(path?: string | null) {
  const safe = safeRelativePath(path);
  if (!safe || !safe.startsWith("/admin")) return "/admin";
  return safe;
}

function safeTenantRedirect(path: string | null, fallback: string) {
  if (!path) return fallback;
  if (path.startsWith("/admin") || path.startsWith("/login") || path.startsWith("/register")) return fallback;
  return path;
}

export async function resolvePostLoginDestination(input: {
  userId: string;
  requestedSpace?: string | null;
  next?: string | null;
}) {
  const safeNext = safeRelativePath(input.next);
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      email: true,
      platformAdmin: true,
      memberships: {
        where: { status: "ACTIVE", organization: { deletedAt: null } },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          organization: {
            select: {
              nbFormationsDeclarees: true,
              nbFormateursDeclares: true,
              nbSessionsMois: true,
              objectifPrincipal: true,
            },
          },
        },
      },
    },
  });
  if (!user) return "/login?oauth=session_missing";

  const isPlatformAdmin = user.platformAdmin || (user.email ? envAdminAllowlist().includes(user.email.toLowerCase()) : false);
  const wantsAdmin = input.requestedSpace === "admin" || safeNext?.startsWith("/admin") === true;
  if (wantsAdmin) {
    return isPlatformAdmin ? safeAdminRedirect(safeNext) : "/login?space=admin&oauth=admin_denied";
  }

  const membership = user.memberships[0] ?? null;
  if (!membership) {
    return isPlatformAdmin ? "/admin" : "/login?oauth=no_membership";
  }

  if (membership.role === "LEARNER") return safeTenantRedirect(safeNext?.startsWith("/espace") ? safeNext : null, "/espace");
  if (membership.role === "TRAINER") return safeTenantRedirect(safeNext?.startsWith("/trainer") ? safeNext : null, "/trainer");

  const organization = membership.organization;
  const needsOnboarding =
    organization.nbFormationsDeclarees == null &&
    organization.nbFormateursDeclares == null &&
    organization.nbSessionsMois == null &&
    organization.objectifPrincipal == null;

  return needsOnboarding ? "/onboarding" : safeTenantRedirect(safeNext, "/dashboard");
}
