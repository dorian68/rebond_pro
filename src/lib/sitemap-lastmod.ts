// Published on 2026-11-03: b4f3086 added identity JSON-LD and navigation links
// through the (site) layout; its blog pages also gained BreadcrumbList.
// 14b232b made the homepage hero visible before hydration on the same day.
// Keep this allowlist explicit: future articles/pages must not inherit the date.
// Update only after a verified, significant published change, never at build time.
const UPDATED_SITE_PATHS = new Set([
  "/",
  "/formation",
  "/bilan-de-competences",
  "/bilan-orientation",
  "/methode",
  "/a-propos",
  "/blog",
  "/contact",
  "/opportunites/service-civique-sainte-lucie",
  "/centres",
  "/blog/changer-de-voie-a-40-ans",
  "/blog/bilan-de-competences-a-quoi-ca-sert",
  "/blog/parcoursup-aider-son-ado-sans-choisir",
  "/blog/cpf-financer-formation-2026",
  "/blog/reprendre-confiance-apres-doute-professionnel",
  "/blog/se-reconvertir-dans-le-numerique-mythes-realites",
  "/blog/se-former-pres-de-chez-soi-territoires-guadeloupe",
]);

/** No trustworthy publication date is available here for the live catalogue. */
export function editorialLastModified(path: string): string | undefined {
  return UPDATED_SITE_PATHS.has(path) ? "2026-11-03" : undefined;
}
