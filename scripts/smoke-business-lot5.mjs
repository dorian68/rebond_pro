import { readFile } from "node:fs/promises";

const checks = [
  ["landing B2C bilan", "src/app/(site)/page.tsx", "bilan"],
  ["landing B2B centre", "src/app/(site)/page.tsx", "centre de formation"],
  ["landing catalogue link", "src/app/(site)/page.tsx", "catalogue"],
  ["onboarding three steps", "src/app/onboarding/onboarding-client.tsx", "Étape {step} sur 3"],
  ["onboarding real submit", "src/app/onboarding/onboarding-client.tsx", "Ouvrir mon cockpit"],
  ["public formation CTA", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "Demander une inscription"],
  ["public request trust copy", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "arrive directement dans le suivi commercial"],
  ["honest empty dashboard", "src/app/(app)/dashboard/page.tsx", "Transformez ce tableau vide"],
  ["email verification", "src/app/verify-email/route.ts", "emailVerified: new Date()"],
  ["terms acceptance", "src/app/(auth)/register/register-form.tsx", "conditions d&apos;utilisation"],
];

let failed = 0;
for (const [label, path, expected] of checks) {
  const content = await readFile(path, "utf8");
  const ok = content.includes(expected);
  console.log(JSON.stringify({ check: label, status: ok ? "pass" : "fail", path }));
  if (!ok) failed++;
}

if (failed) {
  console.error(JSON.stringify({ status: "fail", failed }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", journey: "lot5_acquisition_activation_conversion" }));
}
