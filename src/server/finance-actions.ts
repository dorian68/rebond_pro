"use server";

import { revalidatePath } from "next/cache";
import { requireTenant } from "@/lib/tenant";
import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { settleTransaction } from "@/server/finance";
import { publicFormationCheckout, type CheckoutResult as PublicCheckoutResult } from "@/server/public-purchase";
import { logger } from "@/lib/logger";
import { bilanPaymentsEnabled } from "@/lib/payment-readiness";

/** Action publique (sans compte) : achat d'une formation depuis la marketplace. */
export async function createPublicFormationCheckout(formationId: string): Promise<PublicCheckoutResult> {
  return publicFormationCheckout(formationId);
}

/** Marque une transaction d'achat de formation comme reversée au centre (god-mode plateforme). */
export async function markTransactionSettled(id: string): Promise<void> {
  await requirePlatformAdmin();
  await settleTransaction(id);
  logger.info("finance.payout.settled", { transactionId: id });
  revalidatePath("/admin/finances");
}

export type CheckoutResult = { url?: string; error?: string };

function baseUrl(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Paiement d'une formation publique du catalogue (paiement unique). */
export async function createFormationCheckout(formationId: string): Promise<CheckoutResult> {
  const ctx = await requireTenant();
  if (!isStripeEnabled()) return { error: "Le paiement en ligne n'est pas encore activé sur cet environnement." };

  const f = await prisma.formation.findFirst({
    where: { id: formationId, isPublic: true, status: "PUBLIE", deletedAt: null },
    select: { id: true, title: true, price: true, organizationId: true },
  });
  if (!f) return { error: "Formation indisponible." };
  if (f.price <= 0) return { error: "Cette formation n'a pas de tarif en ligne." };

  const beneficiary = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId }, select: { id: true } });

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: ctx.email ?? undefined,
      line_items: [{ price_data: { currency: "eur", product_data: { name: f.title }, unit_amount: f.price }, quantity: 1 }],
      success_url: `${baseUrl()}/espace/catalogue?achat=success`,
      cancel_url: `${baseUrl()}/espace/catalogue?achat=cancel`,
      metadata: { type: "FORMATION_PURCHASE", organizationId: f.organizationId, formationId: f.id, formationTitle: f.title, ...(beneficiary ? { beneficiaryId: beneficiary.id } : {}) },
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé d'URL de paiement." };
    logger.info("finance.checkout.formation_created", { formationId: f.id });
    return { url: session.url };
  } catch (e) {
    logger.error("finance.checkout.formation_failed", { error: e instanceof Error ? e.message : String(e) });
    return { error: "Impossible de créer le paiement." };
  }
}

/** Paiement du bilan de compétences par le bénéficiaire. Prix : env PLATFORM_BILAN_PRICE (centimes). */
export async function createBilanCheckout(): Promise<CheckoutResult> {
  const ctx = await requireTenant();
  if (!bilanPaymentsEnabled()) {
    return { error: "Le paiement en ligne du bilan n'est pas encore activé." };
  }
  if (!isStripeEnabled()) return { error: "Le paiement en ligne n'est pas encore activé sur cet environnement." };
  const beneficiary = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId }, select: { id: true, organizationId: true } });
  if (!beneficiary) return { error: "Aucun accompagnement bilan lié à ce compte." };
  const amount = Number(process.env.PLATFORM_BILAN_PRICE ?? "120000"); // Aligné sur /bilan-de-competences#offre.

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: ctx.email ?? undefined,
      line_items: [{ price_data: { currency: "eur", product_data: { name: "Bilan de compétences" }, unit_amount: amount }, quantity: 1 }],
      success_url: `${baseUrl()}/espace?paiement=success`,
      cancel_url: `${baseUrl()}/espace?paiement=cancel`,
      metadata: { type: "BILAN", organizationId: beneficiary.organizationId, beneficiaryId: beneficiary.id },
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé d'URL de paiement." };
    return { url: session.url };
  } catch (e) {
    logger.error("finance.checkout.bilan_failed", { error: e instanceof Error ? e.message : String(e) });
    return { error: "Impossible de créer le paiement." };
  }
}
