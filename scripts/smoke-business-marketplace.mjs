import "./_env.mjs";
import { readFile } from "node:fs/promises";

// Smoke business : vérifie que la marketplace porte la valeur attendue (visibilité centres + formateurs).
const checks = [
  ["landing → marketplace", "src/app/page.tsx", "Catalogue des formations"],
  ["landing → explorer CTA", "src/app/page.tsx", "Explorer le catalogue"],
  ["marketplace promesse", "src/app/(public)/marketplace/page.tsx", "Trouvez la formation et le formateur"],
  ["marketplace recherche/filtres", "src/app/(public)/marketplace/page.tsx", "Toutes catégories"],
  ["marketplace annuaire centres", "src/app/(public)/marketplace/page.tsx", "Les centres de formation"],
  ["fiche centre mise en avant", "src/app/(public)/[orgSlug]/page.tsx", "Nos formateurs"],
  ["fiche centre formations", "src/app/(public)/[orgSlug]/page.tsx", "Formations proposées"],
  ["profil formateur visibilité", "src/app/(public)/formateur/[trainerId]/page.tsx", "Formations animées par"],
  ["formation publique → formateurs", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "Vos formateurs"],
  ["formation publique → fiche centre", "src/app/(public)/[orgSlug]/f/[publicSlug]/page.tsx", "Fiche du centre"],
  ["marketplace publique seulement", "src/server/marketplace.ts", "isPublic: true"],
];

let failed = 0;
for (const [label, path, expected] of checks) {
  let ok = false;
  try { ok = (await readFile(path, "utf8")).includes(expected); } catch { ok = false; }
  console.log(JSON.stringify({ check: label, status: ok ? "pass" : "fail", path }));
  if (!ok) failed++;
}

if (failed) {
  console.error(JSON.stringify({ status: "fail", failed }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "pass", journey: "marketplace_visibility_centers_trainers" }));
}
