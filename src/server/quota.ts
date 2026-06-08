import "server-only";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/server/billing";
import type { TenantContext } from "@/lib/tenant";

export type QuotaKind = "trainers" | "sessions" | "ai";

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Usage courant + limite du plan pour une ressource. */
export async function quotaUsage(ctx: TenantContext, kind: QuotaKind): Promise<{ used: number; limit: number }> {
  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { plan: true } });
  const limits = planLimits(org?.plan ?? "FREE");
  const orgId = ctx.organizationId;

  if (kind === "trainers") {
    const used = await prisma.trainer.count({ where: { organizationId: orgId, deletedAt: null } });
    return { used, limit: limits.trainers };
  }
  if (kind === "sessions") {
    const used = await prisma.session.count({ where: { organizationId: orgId, deletedAt: null, createdAt: { gte: monthStart() } } });
    return { used, limit: limits.sessionsPerMonth };
  }
  // ai
  const used = await prisma.aiInteraction.count({ where: { organizationId: orgId, createdAt: { gte: monthStart() } } });
  return { used, limit: limits.aiActions };
}

const LABELS: Record<QuotaKind, string> = {
  trainers: "formateurs",
  sessions: "sessions ce mois-ci",
  ai: "actions IA ce mois-ci",
};

/** Lève une erreur claire si la limite du plan est atteinte (used >= limit). */
export async function enforceQuota(ctx: TenantContext, kind: QuotaKind): Promise<void> {
  const { used, limit } = await quotaUsage(ctx, kind);
  if (used >= limit) {
    throw new Error(`Limite de votre plan atteinte (${limit} ${LABELS[kind]}). Passez à un plan supérieur dans Paramètres → Abonnement pour continuer.`);
  }
}
