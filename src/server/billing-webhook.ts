import "server-only";
import { prisma } from "@/lib/prisma";
import { planFromPriceId } from "@/server/billing";
import { logger } from "@/lib/logger";
import type Stripe from "stripe";

/**
 * Applique un événement Stripe à l'état de facturation de l'organisation.
 * Isolé de la vérification de signature pour être testable en CLI.
 * Retourne un résumé de l'action (ou ignored).
 */
export async function applyStripeEvent(event: Stripe.Event): Promise<{ handled: boolean; type: string; organizationId?: string }> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const orgId = s.metadata?.organizationId ?? (await orgIdFromCustomer(s.customer));
      if (!orgId) return { handled: false, type: event.type };
      await prisma.organization.updateMany({
        where: { id: orgId },
        data: {
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : null,
          stripeCustomerId: typeof s.customer === "string" ? s.customer : undefined,
          billingStatus: "active",
          plan: (s.metadata?.plan as "PRO" | "PREMIUM" | undefined) ?? "PRO",
        },
      });
      logger.info("billing.webhook.checkout_completed", { organizationId: orgId });
      return { handled: true, type: event.type, organizationId: orgId };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.organizationId ?? (await orgIdFromCustomer(sub.customer));
      if (!orgId) return { handled: false, type: event.type };
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;
      const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
      await prisma.organization.updateMany({
        where: { id: orgId },
        data: {
          plan: planFromPriceId(priceId),
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          billingStatus: sub.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      });
      logger.info("billing.webhook.subscription_updated", { organizationId: orgId, status: sub.status });
      return { handled: true, type: event.type, organizationId: orgId };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.organizationId ?? (await orgIdFromCustomer(sub.customer));
      if (!orgId) return { handled: false, type: event.type };
      await prisma.organization.updateMany({
        where: { id: orgId },
        data: { plan: "FREE", billingStatus: "canceled", stripeSubscriptionId: null, stripePriceId: null, currentPeriodEnd: null },
      });
      logger.info("billing.webhook.subscription_deleted", { organizationId: orgId });
      return { handled: true, type: event.type, organizationId: orgId };
    }
    default:
      return { handled: false, type: event.type };
  }
}

async function orgIdFromCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined): Promise<string | undefined> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return undefined;
  const org = await prisma.organization.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return org?.id;
}
