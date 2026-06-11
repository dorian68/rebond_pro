import "./_env";
import { prisma } from "../src/lib/prisma";
import { createTestTenant, step, assert, runner } from "./_tenant";

// Ce smoke valide explicitement le fallback sans Stripe et ne doit jamais
// utiliser une clé réelle héritée de .env.local.
delete process.env.STRIPE_SECRET_KEY;

// Vérifie l'achat PUBLIC (sans compte) : appelable sans session, gating public/publié/prix,
// et dégradation propre quand Stripe n'est pas configuré (env de test). La création réelle de
// l'inscription post-paiement est couverte par smoke:finance (enrollBeneficiaryInFormation).
runner("public_purchase_smoke", async () => {
  const { publicFormationCheckout } = await import("../src/server/public-purchase");
  const t = await createTestTenant("pubbuy");
  try {
    const stamp = Date.now();
    // 1. Formation publique, publiée, payante
    const pub = await prisma.formation.create({
      data: { organizationId: t.organizationId, title: "Formation Publique", slug: `pub-${stamp}`, price: 50000, status: "PUBLIE", isPublic: true, publicSlug: `pub-${stamp}` },
    });
    // 2. Formation privée (non publiée)
    const priv = await prisma.formation.create({
      data: { organizationId: t.organizationId, title: "Formation Privée", slug: `priv-${stamp}`, price: 50000, status: "BROUILLON", isPublic: false },
    });
    // 3. Formation publique gratuite
    const free = await prisma.formation.create({
      data: { organizationId: t.organizationId, title: "Formation Gratuite", slug: `free-${stamp}`, price: 0, status: "PUBLIE", isPublic: true, publicSlug: `free-${stamp}` },
    });

    // Aucune session requireTenant : l'appel aboutit sans contexte d'authentification.
    const r1 = await publicFormationCheckout(pub.id);
    assert(typeof r1 === "object" && (r1.url || r1.error), "L'achat public doit renvoyer url|error sans lever (pas d'auth requise).");
    // Stripe non configuré en test → message d'activation (preuve : la validation public/prix est passée).
    assert(!r1.url && /activé/i.test(r1.error ?? ""), "Avec une formation publique valide, on doit atteindre l'étape Stripe (désactivée en test).");
    step("public_formation_reaches_stripe", { error: r1.error });

    const r2 = await publicFormationCheckout(priv.id);
    assert(r2.error && /indisponible/i.test(r2.error), "Une formation non publiée ne doit PAS être achetable publiquement.");
    step("private_formation_blocked");

    const r3 = await publicFormationCheckout(free.id);
    assert(r3.error && /achat en ligne/i.test(r3.error), "Une formation à prix 0 n'est pas achetable en ligne.");
    step("free_formation_blocked");

    const r4 = await publicFormationCheckout("does-not-exist");
    assert(r4.error && /indisponible/i.test(r4.error), "Un id inconnu doit être rejeté proprement.");
    step("unknown_formation_blocked");
  } finally {
    await t.cleanup();
    step("tenant_cleanup");
  }
});
