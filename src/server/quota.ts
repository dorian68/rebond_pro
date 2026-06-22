import "server-only";
import { prisma } from "@/lib/prisma";
import { planLimits } from "@/server/billing";
import type { TenantContext } from "@/lib/tenant";

export type QuotaKind = "trainers" | "sessions" | "ai";

const TEMPORARY_UNLIMITED = 1_000_000;

/** Bypass temporaire pour tests produit : ne modifie ni le plan ni la facturation. */
export function arePlanLimitsDisabled(): boolean {
  return process.env.CENTER_PLAN_LIMITS_DISABLED === "true";
}

function monthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Usage courant + limite du plan pour une ressource. */
export async function quotaUsage(ctx: TenantContext, kind: QuotaKind): Promise<{ used: number; limit: number }> {
  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { plan: true } });
  const limits = planLimits(org?.plan ?? "FREE");
  const orgId = ctx.organizationId;
  const overrideLimit = arePlanLimitsDisabled() ? TEMPORARY_UNLIMITED : null;

  if (kind === "trainers") {
    const used = await prisma.trainer.count({ where: { organizationId: orgId, deletedAt: null } });
    return { used, limit: overrideLimit ?? limits.trainers };
  }
  if (kind === "sessions") {
    const used = await prisma.session.count({ where: { organizationId: orgId, deletedAt: null, createdAt: { gte: monthStart() } } });
    return { used, limit: overrideLimit ?? limits.sessionsPerMonth };
  }
  // ai
  const used = await prisma.aiInteraction.count({ where: { organizationId: orgId, createdAt: { gte: monthStart() } } });
  return { used, limit: overrideLimit ?? limits.aiActions };
}

const LABELS: Record<QuotaKind, string> = {
  trainers: "formateurs",
  sessions: "sessions ce mois-ci",
  ai: "actions IA ce mois-ci",
};

/** Lève une erreur claire si la limite du plan est atteinte (used >= limit). */
export async function enforceQuota(ctx: TenantContext, kind: QuotaKind): Promise<void> {
  if (arePlanLimitsDisabled()) return;
  const { used, limit } = await quotaUsage(ctx, kind);
  if (used >= limit) {
    throw new Error(`Limite de votre plan atteinte (${limit} ${LABELS[kind]}). Passez à un plan supérieur dans Paramètres → Abonnement pour continuer.`);
  }
}
