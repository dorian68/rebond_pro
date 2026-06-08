import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";
import { PLANS, getPlan, planFromPriceId, getBillingState } from "../src/server/billing";
import { isStripeEnabled } from "../src/lib/stripe";
import { applyStripeEvent } from "../src/server/billing-webhook";
import type Stripe from "stripe";

runner("billing_smoke", async () => {
  // 1. Catalogue de plans
  const ids = PLANS.map((p) => p.id);
  assert(ids.includes("FREE") && ids.includes("PRO") && ids.includes("PREMIUM"), "Catalogue de plans incomplet.");
  assert(getPlan("PRO").limits.trainers > getPlan("FREE").limits.trainers, "Les quotas PRO doivent dépasser FREE.");
  step("plan_catalog", { plans: ids });

  // 2. Mapping priceId → plan
  process.env.STRIPE_PRICE_PRO = "price_pro_test";
  process.env.STRIPE_PRICE_PREMIUM = "price_premium_test";
  assert(planFromPriceId("price_pro_test") === "PRO", "Mapping PRO KO.");
  assert(planFromPriceId("price_premium_test") === "PREMIUM", "Mapping PREMIUM KO.");
  assert(planFromPriceId("inconnu") === "FREE", "Un priceId inconnu doit retomber sur FREE.");
  step("price_mapping");

  // 3. Fallback : Stripe non configuré → pas de crash, état lisible
  const stripeOff = !isStripeEnabled(); // pas de STRIPE_SECRET_KEY en test
  step("stripe_fallback", { stripeEnabled: !stripeOff });

  const t = await createTestTenant("billing");
  try {
    // 4. État de facturation par défaut (FREE)
    const state = await getBillingState(t);
    assert(state.plan === "FREE", "Un nouveau tenant doit être en FREE.");
    assert(typeof state.stripeEnabled === "boolean", "stripeEnabled doit être exposé.");
    step("billing_state_default", { plan: state.plan });

    // 5. Webhook : subscription.updated → upgrade plan (handler isolé, sans signature)
    await prisma.organization.update({ where: { id: t.organizationId }, data: { stripeCustomerId: `cus_${t.organizationId.slice(0, 8)}` } });
    const subEvent = {
      type: "customer.subscription.updated",
      data: { object: {
        id: "sub_test", status: "active",
        metadata: { organizationId: t.organizationId },
        items: { data: [{ price: { id: "price_pro_test" } }] },
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      } },
    } as unknown as Stripe.Event;
    const r1 = await applyStripeEvent(subEvent);
    assert(r1.handled && r1.organizationId === t.organizationId, "L'événement subscription.updated n'a pas été traité.");
    const upgraded = await prisma.organization.findUnique({ where: { id: t.organizationId } });
    assert(upgraded?.plan === "PRO" && upgraded.billingStatus === "active" && upgraded.stripeSubscriptionId === "sub_test", "L'abonnement n'a pas été appliqué.");
    step("webhook_subscription_upgrade", { plan: upgraded.plan });

    // 6. Webhook : subscription.deleted → downgrade FREE
    const delEvent = {
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_test", status: "canceled", metadata: { organizationId: t.organizationId }, items: { data: [] } } },
    } as unknown as Stripe.Event;
    await applyStripeEvent(delEvent);
    const downgraded = await prisma.organization.findUnique({ where: { id: t.organizationId } });
    assert(downgraded?.plan === "FREE" && downgraded.billingStatus === "canceled" && !downgraded.stripeSubscriptionId, "Le downgrade après annulation a échoué.");
    step("webhook_subscription_cancel", { plan: downgraded.plan });
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
