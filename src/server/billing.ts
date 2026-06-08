import "server-only";
import { prisma } from "@/lib/prisma";
import { isStripeEnabled } from "@/lib/stripe";
import type { TenantContext } from "@/lib/tenant";
import type { Plan } from "@prisma/client";

/**
 * Catalogue des plans + quotas (entitlements).
 * Les `priceId` viennent de Stripe (variables d'env) ; absents → upgrade indisponible
 * mais l'app reste pleinement utilisable en FREE (aucun faux blocage).
 */
export type PlanDef = {
  id: Plan;
  name: string;
  priceLabel: string;
  priceId: string | null;
  features: string[];
  limits: { trainers: number; sessionsPerMonth: number; aiActions: number };
};

const UNLIMITED = 1_000_000;

export const PLANS: PlanDef[] = [
  {
    id: "FREE",
    name: "Découverte",
    priceLabel: "0 € / mois",
    priceId: null,
    features: ["1 centre", "Jusqu'à 2 formateurs", "Catalogue public (marketplace)", "Copilote IA (limité)"],
    limits: { trainers: 2, sessionsPerMonth: 5, aiActions: 50 },
  },
  {
    id: "PRO",
    name: "Pro",
    priceLabel: "49 € / mois",
    priceId: process.env.STRIPE_PRICE_PRO ?? null,
    features: ["Formateurs illimités", "Sessions illimitées", "Documents PDF illimités", "Copilote IA étendu", "Exports CSV"],
    limits: { trainers: UNLIMITED, sessionsPerMonth: UNLIMITED, aiActions: 1000 },
  },
  {
    id: "PREMIUM",
    name: "Premium",
    priceLabel: "99 € / mois",
    priceId: process.env.STRIPE_PRICE_PREMIUM ?? null,
    features: ["Tout le plan Pro", "Mise en avant marketplace", "Copilote IA illimité", "Support prioritaire"],
    limits: { trainers: UNLIMITED, sessionsPerMonth: UNLIMITED, aiActions: UNLIMITED },
  },
];

export function getPlan(id: Plan): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Quotas du plan d'une organisation. */
export function planLimits(plan: Plan) {
  return getPlan(plan).limits;
}

/** État de facturation pour l'UI. */
export async function getBillingState(ctx: TenantContext) {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { plan: true, billingStatus: true, trialEndsAt: true, currentPeriodEnd: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  const plan: Plan = org?.plan ?? "FREE";
  return {
    plan,
    planName: getPlan(plan).name,
    billingStatus: org?.billingStatus ?? null,
    trialEndsAt: org?.trialEndsAt ?? null,
    currentPeriodEnd: org?.currentPeriodEnd ?? null,
    hasSubscription: Boolean(org?.stripeSubscriptionId),
    stripeEnabled: isStripeEnabled(),
    plans: PLANS,
  };
}

export type BillingState = Awaited<ReturnType<typeof getBillingState>>;

/** Mappe un priceId Stripe vers un plan interne. */
export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "PREMIUM";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  return "FREE";
}
