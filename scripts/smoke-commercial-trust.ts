import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const rootLayout = read("src/app/layout.tsx");
const home = read("src/app/(site)/page.tsx");
const testimonials = read("src/app/(site)/temoignages/page.tsx");
const demoSeed = read("src/lib/demo-seed.ts");
const prismaSeed = read("prisma/seed.ts");
const carifSeed = read("scripts/seed-carif-centers.ts");
const publication = read("src/lib/marketplace-publication.ts");
const purchase = read("src/server/public-purchase.ts");
const paymentReadiness = read("src/lib/payment-readiness.ts");
const envExample = read(".env.example");
const legalNotice = read("src/app/(public)/legal/mentions/page.tsx");
const pricing = read("src/app/(site)/tarifs/page.tsx");
const footer = read("src/components/site/Footer.tsx");

assert(!rootLayout.includes("googletagmanager") && !rootLayout.includes("gtag("), "Aucun traceur ne doit partir sans gestion du consentement.");
assert(!home.includes("Camille R.") && !home.includes("temoignage-camille"), "Le témoignage artificiel de l'accueil doit rester supprimé.");
assert(testimonials.includes('redirect("/a-propos")'), "L'ancienne page de faux témoignages doit rester neutralisée.");
assert(!demoSeed.includes("prisma.testimonial.create") && !prismaSeed.includes("prisma.testimonial.create"), "Les seeds ne doivent pas créer de preuve sociale fictive.");

assert(carifSeed.includes('marketplaceStatus: "PENDING"'), "Les imports CARIF doivent attendre une revue humaine.");
assert(carifSeed.includes("publicProfileEnabled: false"), "Les imports CARIF doivent être privés par défaut.");
assert(!carifSeed.includes('marketplaceStatus: "APPROVED"'), "Un import CARIF ne doit jamais s'auto-approuver.");
assert(publication.includes("marketplaceReviewedAt") && publication.includes("marketplaceReviewedBy"), "La publication doit exiger une preuve de revue humaine.");

assert(purchase.includes("publicFormationPaymentsEnabled"), "Le paiement formation doit avoir un feature gate juridique.");
assert(purchase.includes("places disponibles"), "Le paiement formation doit exiger une session ouverte avec capacité.");
assert(paymentReadiness.includes("BILAN_PAYMENTS_ENABLED") && paymentReadiness.includes("ORGANISME_FORMATION_NDA"), "Le paiement bilan doit exiger une activation et un NDA.");
assert(envExample.includes('PUBLIC_FORMATION_PAYMENTS_ENABLED="false"'), "Les paiements formation doivent être fermés par défaut.");
assert(envExample.includes('BILAN_PAYMENTS_ENABLED="false"'), "Les paiements bilan doivent être fermés par défaut.");

assert(legalNotice.includes("943 812 297") && legalNotice.includes("Hetzner Online GmbH"), "Les mentions légales doivent identifier l'éditeur et l'hébergeur.");
assert(footer.includes('/legal/mentions'), "Les mentions légales doivent être accessibles depuis le footer.");
assert(pricing.includes('redirect("/bilan-de-competences#offre")'), "Les tarifs bilan doivent avoir une source publique unique.");

for (const [path, forbidden] of [
  ["src/app/(site)/page.tsx", "organismes certifiés"],
  ["src/app/(site)/centres/page.tsx", "Compatible CPF & Qualiopi"],
  ["src/app/(site)/pour-qui/page.tsx", "Éligible CPF"],
] as const) {
  assert(!read(path).includes(forbidden), `Promesse non prouvée détectée dans ${path}: ${forbidden}`);
}

console.log("smoke:commercial-trust PASS");
