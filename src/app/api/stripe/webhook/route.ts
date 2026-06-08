import { NextResponse } from "next/server";
import { getStripe, isStripeEnabled, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe";
import { applyStripeEvent } from "@/server/billing-webhook";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isStripeEnabled() || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "stripe_not_configured" }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false, error: "missing_signature" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    logger.warn("billing.webhook.bad_signature", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 400 });
  }

  try {
    const result = await applyStripeEvent(event);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error("billing.webhook.handler_error", { type: event.type, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ok: false, error: "handler_error" }, { status: 500 });
  }
}
