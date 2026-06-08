import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe est-il configuré (clé secrète présente) ? */
export function isStripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Client Stripe (lazy). Lève si non configuré — appeler isStripeEnabled() avant. */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
