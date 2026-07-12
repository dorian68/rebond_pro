import { readFile } from "node:fs/promises";

const checks = [
  ["brand Le Bon Rebond", "src/app/(site)/page.tsx", "Le Bon Rebond"],
  ["landing two paths formation", "src/app/(site)/page.tsx", "Je cherche une formation"],
  ["landing two paths bilan", "src/app/(site)/page.tsx", "Je veux faire un bilan"],
  ["formation landing", "src/app/(site)/formation/page.tsx", "Trouver ma formation"],
  ["bilan landing", "src/app/(site)/bilan-de-competences/page.tsx", "Bilan de compétences"],
  ["orientation landing", "src/app/(site)/bilan-orientation/page.tsx", "Choisir une orientation"],
  ["proprietary method", "src/app/(site)/methode/page.tsx", "Rebond Clarté"],
  ["partner entry", "src/app/(site)/page.tsx", "Rejoindre le réseau"],
  ["onboarding three steps", "src/app/onboarding/onboarding-client.tsx", "Étape {step} / 3"],
  ["onboarding real submit", "src/app/onboarding/onboarding-client.tsx", "Terminer"],
  ["public formation CTA", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "Demander une inscription"],
  ["public request trust copy", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "arrive directement dans le suivi commercial"],
  ["honest empty dashboard", "src/app/(app)/dashboard/page.tsx", "Transformez ce tableau vide"],
  ["email verification", "src/app/verify-email/route.ts", "emailVerified: new Date()"],
  ["terms acceptance", "src/app/(auth)/register/register-form.tsx", "conditions d&apos;utilisation"],
];

const forbiddenChecks = [
  ["bilan competencies method naming", "src/app/(site)/bilan-de-competences/page.tsx", "Rebond Clarté"],
  ["orientation method naming", "src/app/(site)/bilan-orientation/page.tsx", "Rebond Clarté"],
  ["orientation method suffix", "src/app/(site)/bilan-orientation/page.tsx", "version jeunes"],
];

let failed = 0;
for (const [label, path, expected] of checks) {
  const content = await readFile(path, "utf8");
  const ok = content.includes(expected);
  console.log(JSON.stringify({ check: label, status: ok ? "pass" : "fail", path }));
  if (!ok) failed++;
}

for (const [label, path, forbidden] of forbiddenChecks) {
  const content = await readFile(path, "utf8");
  const ok = !content.includes(forbidden);
  console.log(JSON.stringify({ check: label, status: ok ? "pass" : "fail", path }));
  if (!ok) failed++;
}

if (failed) {
  console.error(JSON.stringify({ status: "fail", failed }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", journey: "le_bon_rebond_two_path_acquisition" }));
}
