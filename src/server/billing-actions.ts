"use server";

import { requireTenant, requireRole } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { getPlan } from "@/server/billing";
import { logger } from "@/lib/logger";
import type { Plan } from "@prisma/client";

export type BillingActionResult = { url?: string; error?: string };

function baseUrl(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

async function ensureCustomer(orgId: string, orgName: string | null, email: string | null): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { stripeCustomerId: true } });
  if (org?.stripeCustomerId) return org.stripeCustomerId;
  const customer = await getStripe().customers.create({
    name: orgName ?? undefined,
    email: email ?? undefined,
    metadata: { organizationId: orgId },
  });
  await prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Crée une session de paiement Stripe Checkout pour un plan. Retourne l'URL à ouvrir. */
export async function createCheckoutSession(plan: Plan): Promise<BillingActionResult> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  if (!isStripeEnabled()) return { error: "La facturation n'est pas encore activée sur cet environnement." };

  const def = getPlan(plan);
  if (!def.priceId) return { error: `Le plan ${def.name} n'a pas de tarif Stripe configuré.` };

  try {
    const customerId = await ensureCustomer(ctx.organizationId, ctx.organizationName, ctx.email);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: def.priceId, quantity: 1 }],
      success_url: `${baseUrl()}/parametres?billing=success`,
      cancel_url: `${baseUrl()}/parametres?billing=cancel`,
      metadata: { organizationId: ctx.organizationId, plan },
      subscription_data: { metadata: { organizationId: ctx.organizationId } },
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé d'URL de paiement." };
    logger.info("billing.checkout_created", { organizationId: ctx.organizationId, plan });
    return { url: session.url };
  } catch (e) {
    logger.error("billing.checkout_failed", { organizationId: ctx.organizationId, error: e instanceof Error ? e.message : String(e) });
    return { error: "Impossible de créer la session de paiement." };
  }
}

/** Ouvre le portail de gestion d'abonnement Stripe. */
export async function createBillingPortalSession(): Promise<BillingActionResult> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN"]);
  if (!isStripeEnabled()) return { error: "La facturation n'est pas encore activée sur cet environnement." };

  const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { stripeCustomerId: true } });
  if (!org?.stripeCustomerId) return { error: "Aucun abonnement à gérer pour le moment." };

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${baseUrl()}/parametres`,
    });
    return { url: session.url };
  } catch (e) {
    logger.error("billing.portal_failed", { organizationId: ctx.organizationId, error: e instanceof Error ? e.message : String(e) });
    return { error: "Impossible d'ouvrir le portail de facturation." };
  }
}
