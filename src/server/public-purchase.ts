import "server-only";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export type CheckoutResult = { url?: string; error?: string };

function baseUrl(): string {
  return (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Achat PUBLIC d'une formation depuis la marketplace, SANS compte (checkout invité).
 * Stripe collecte l'email du payeur ; le webhook FORMATION_PURCHASE crée ensuite un Learner
 * et l'inscrit dans le centre vendeur (cf. enrollBeneficiaryInFormation).
 * Aucune authentification requise — d'où le module séparé de `finance-actions` (qui exige un tenant).
 */
export async function publicFormationCheckout(formationId: string): Promise<CheckoutResult> {
  // 1. La formation doit être publique et publiée (validé avant Stripe pour rester testable en CLI).
  const f = await prisma.formation.findFirst({
    where: { id: formationId, isPublic: true, status: "PUBLIE", deletedAt: null },
    select: { id: true, title: true, price: true, organizationId: true, publicSlug: true, organization: { select: { slug: true } } },
  });
  if (!f) return { error: "Formation indisponible." };
  if (f.price <= 0) return { error: "Cette formation n'est pas disponible à l'achat en ligne." };

  // 2. Stripe requis pour aller plus loin.
  if (!isStripeEnabled()) return { error: "Le paiement en ligne n'est pas encore activé sur cet environnement." };

  try {
    const back = `${baseUrl()}/${f.organization.slug}/f/${f.publicSlug}`;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      line_items: [{ price_data: { currency: "eur", product_data: { name: f.title }, unit_amount: f.price }, quantity: 1 }],
      success_url: `${back}?achat=success`,
      cancel_url: `${back}?achat=cancel`,
      metadata: { type: "FORMATION_PURCHASE", organizationId: f.organizationId, formationId: f.id, formationTitle: f.title, source: "public" },
    });
    if (!session.url) return { error: "Stripe n'a pas renvoyé d'URL de paiement." };
    logger.info("finance.checkout.public_formation_created", { formationId: f.id });
    return { url: session.url };
  } catch (e) {
    logger.error("finance.checkout.public_formation_failed", { error: e instanceof Error ? e.message : String(e) });
    return { error: "Impossible de créer le paiement." };
  }
}
