import "server-only";

import { prisma } from "@/lib/prisma";
import type { PlatformAdmin } from "@/lib/platform";

export type PlatformAdminSource = "database" | "configuration" | "database_and_configuration";

export type PlatformAdminManagementData = {
  currentUserId: string;
  admins: Array<{
    id: string;
    email: string;
    name: string | null;
    emailVerified: boolean;
    lastLoginAt: string | null;
    source: PlatformAdminSource;
    isCurrentUser: boolean;
    canRevoke: boolean;
  }>;
  configuredWithoutAccount: string[];
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actor: { name: string | null; email: string } | null;
    target: { name: string | null; email: string } | null;
  }>;
};

export class PlatformAdminAccessError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "UNVERIFIED" | "SELF_REVOKE" | "CONFIG_MANAGED" | "NO_CHANGE",
    message: string,
  ) {
    super(message);
    this.name = "PlatformAdminAccessError";
  }
}

function envAdminEmails(): string[] {
  return [...new Set(
    (process.env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export function validatePlatformAdminTransition(input: {
  actorUserId: string;
  targetUserId: string;
  targetEmailVerified: boolean;
  targetHasDatabaseRole: boolean;
  targetManagedByConfiguration: boolean;
  enabled: boolean;
}) {
  if (input.enabled) {
    if (!input.targetEmailVerified) {
      throw new PlatformAdminAccessError(
        "UNVERIFIED",
        "Ce compte doit confirmer son adresse email avant de devenir super-admin.",
      );
    }
    if (input.targetHasDatabaseRole || input.targetManagedByConfiguration) {
      throw new PlatformAdminAccessError("NO_CHANGE", "Ce compte possède déjà l’accès super-admin.");
    }
    return;
  }

  if (input.actorUserId === input.targetUserId) {
    throw new PlatformAdminAccessError(
      "SELF_REVOKE",
      "Vous ne pouvez pas retirer votre propre accès depuis cet écran.",
    );
  }
  if (input.targetManagedByConfiguration) {
    throw new PlatformAdminAccessError(
      "CONFIG_MANAGED",
      "Cet accès est imposé par la configuration de déploiement. Retirez d’abord l’adresse de PLATFORM_ADMIN_EMAILS.",
    );
  }
  if (!input.targetHasDatabaseRole) {
    throw new PlatformAdminAccessError("NO_CHANGE", "Ce compte ne possède déjà plus l’accès super-admin.");
  }
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function listPlatformAdminManagement(actor: PlatformAdmin): Promise<PlatformAdminManagementData> {
  const configuredEmails = envAdminEmails();
  const configuredFilter = configuredEmails.length > 0
    ? [{ email: { in: configuredEmails, mode: "insensitive" as const } }]
    : [];

  const [users, recentActivity] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ platformAdmin: true }, ...configuredFilter] },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        lastLoginAt: true,
        platformAdmin: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    prisma.platformAdminAuditLog.findMany({
      select: {
        id: true,
        action: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
        target: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const configuredSet = new Set(configuredEmails);
  const accountEmails = new Set(users.map((user) => user.email.toLowerCase()));

  return {
    currentUserId: actor.userId,
    admins: users.map((user) => {
      const managedByConfiguration = configuredSet.has(user.email.toLowerCase());
      const source: PlatformAdminSource = user.platformAdmin && managedByConfiguration
        ? "database_and_configuration"
        : managedByConfiguration
          ? "configuration"
          : "database";
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified !== null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        source,
        isCurrentUser: user.id === actor.userId,
        canRevoke: user.id !== actor.userId && !managedByConfiguration,
      };
    }),
    configuredWithoutAccount: configuredEmails.filter((email) => !accountEmails.has(email)),
    recentActivity: recentActivity.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function changePlatformAdminAccess(input: {
  actor: PlatformAdmin;
  targetUserId: string;
  enabled: boolean;
}) {
  const configuredSet = new Set(envAdminEmails());

  const result = await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, email: true, emailVerified: true, platformAdmin: true },
    });
    if (!target) throw new PlatformAdminAccessError("NOT_FOUND", "Compte utilisateur introuvable.");

    const managedByConfiguration = configuredSet.has(target.email.toLowerCase());
    validatePlatformAdminTransition({
      actorUserId: input.actor.userId,
      targetUserId: target.id,
      targetEmailVerified: target.emailVerified !== null,
      targetHasDatabaseRole: target.platformAdmin,
      targetManagedByConfiguration: managedByConfiguration,
      enabled: input.enabled,
    });

    const changed = await tx.user.updateMany({
      where: { id: target.id, platformAdmin: !input.enabled },
      data: { platformAdmin: input.enabled },
    });
    if (changed.count !== 1) {
      throw new PlatformAdminAccessError(
        "NO_CHANGE",
        "Le rôle a changé pendant l’opération. Actualisez la page avant de réessayer.",
      );
    }

    const action = input.enabled ? "platform_admin.granted" : "platform_admin.revoked";
    await tx.platformAdminAuditLog.create({
      data: {
        actorUserId: input.actor.userId,
        targetUserId: target.id,
        action,
        before: { platformAdmin: !input.enabled, managedByConfiguration },
        after: { platformAdmin: input.enabled, managedByConfiguration },
      },
    });
    return { targetUserId: target.id, action };
  });

  console.info("platform_admin_access_changed", {
    actorUserId: input.actor.userId,
    targetUserId: result.targetUserId,
    action: result.action,
  });
  return result;
}
