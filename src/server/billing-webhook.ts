import "server-only";
import { prisma } from "@/lib/prisma";
import { planFromPriceId } from "@/server/billing";
import { recordTransaction } from "@/server/finance";
import { enrollBeneficiaryInFormation } from "@/server/enrollment-from-purchase";
import { sendEmail, brandedEmail } from "@/lib/email";
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
      const kind = s.metadata?.type; // FORMATION_PURCHASE | BILAN | (sinon abonnement)
      const amount = s.amount_total ?? 0;
      const payerEmail = s.customer_details?.email ?? s.customer_email ?? null;
      const payerName = s.customer_details?.name ?? null;

      if (kind === "FORMATION_PURCHASE") {
        const formationId = s.metadata?.formationId ?? null;
        const beneficiaryId = s.metadata?.beneficiaryId ?? null;
        const txId = await recordTransaction({ organizationId: orgId, type: "FORMATION_PURCHASE", amount, stripeRef: s.id, payerEmail, payerName, formationId, beneficiaryId, description: s.metadata?.formationTitle ?? "Achat de formation" });
        // Inscription automatique (nouvelle transaction uniquement, pour ne pas ré-inscrire sur doublon webhook).
        if (txId && formationId) {
          const res = await enrollBeneficiaryInFormation({ organizationId: orgId, formationId, beneficiaryId, payerEmail, payerName });
          if (res?.enrollmentId) await prisma.transaction.update({ where: { id: txId }, data: { enrollmentId: res.enrollmentId } });
          // Confirmation à l'acheteur (best-effort : ne bloque jamais le webhook).
          if (payerEmail) {
            const title = s.metadata?.formationTitle ?? "votre formation";
            try {
              await sendEmail({
                to: payerEmail,
                subject: `Confirmation de votre inscription — ${title}`,
                html: brandedEmail("Inscription confirmée", `<p>Bonjour${payerName ? " " + payerName : ""},</p><p>Votre paiement pour <strong>${title}</strong> est confirmé et votre inscription est enregistrée auprès du centre de formation.</p><p>Le centre vous contactera prochainement pour les modalités (dates, lieu, accès).</p>`),
                text: `Votre inscription à ${title} est confirmée. Le centre vous contactera pour les modalités.`,
              });
            } catch (e) {
              logger.error("finance.webhook.confirmation_email_failed", { error: e instanceof Error ? e.message : String(e) });
            }
          }
        }
        logger.info("finance.webhook.formation_purchase", { organizationId: orgId, amount });
        return { handled: true, type: event.type, organizationId: orgId };
      }
      if (kind === "BILAN") {
        await recordTransaction({ organizationId: orgId, type: "BILAN", amount, stripeRef: s.id, payerEmail, payerName, beneficiaryId: s.metadata?.beneficiaryId ?? null, description: "Bilan de compétences" });
        logger.info("finance.webhook.bilan_payment", { organizationId: orgId, amount });
        return { handled: true, type: event.type, organizationId: orgId };
      }

      // Sinon : souscription d'abonnement centre
      await prisma.organization.updateMany({
        where: { id: orgId },
        data: {
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : null,
          stripeCustomerId: typeof s.customer === "string" ? s.customer : undefined,
          billingStatus: "active",
          plan: (s.metadata?.plan as "PRO" | "PREMIUM" | undefined) ?? "PRO",
        },
      });
      if (amount > 0) await recordTransaction({ organizationId: orgId, type: "SUBSCRIPTION", amount, stripeRef: s.id, payerEmail, payerName, description: `Abonnement ${s.metadata?.plan ?? "PRO"}` });
      logger.info("billing.webhook.checkout_completed", { organizationId: orgId });
      return { handled: true, type: event.type, organizationId: orgId };
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const orgId = await orgIdFromCustomer(inv.customer);
      if (!orgId) return { handled: false, type: event.type };
      const amount = inv.amount_paid ?? 0;
      if (amount > 0) {
        await recordTransaction({ organizationId: orgId, type: "SUBSCRIPTION", amount, stripeRef: inv.id, payerEmail: inv.customer_email ?? null, description: "Abonnement (renouvellement)" });
        logger.info("finance.webhook.subscription_invoice", { organizationId: orgId, amount });
      }
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
