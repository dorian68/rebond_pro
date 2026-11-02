import type { Prisma } from "@prisma/client";
import { VERIFIED_MARKETPLACE_ORGANIZATION } from "./marketplace-publication";
import { centerPath, formationPath } from "./site-seo";

// A centre and a formation can each add one URL; retain room below 50,000 URLs.
export const CATALOG_SITEMAP_FORMATION_LIMIT = 24_000;

export const publicCatalogSitemapQuery = {
  where: {
    isPublic: true,
    status: "PUBLIE",
    deletedAt: null,
    organization: VERIFIED_MARKETPLACE_ORGANIZATION,
  },
  select: { publicSlug: true, organization: { select: { slug: true } } },
  orderBy: { id: "asc" },
  take: CATALOG_SITEMAP_FORMATION_LIMIT + 1,
} satisfies Prisma.FormationFindManyArgs;

export function publicCatalogSitemapPaths(rows: readonly { publicSlug: string | null; organization: { slug: string } }[]): string[] {
  if (rows.length > CATALOG_SITEMAP_FORMATION_LIMIT) {
    throw new Error("CATALOG_SITEMAP_REQUIRES_PAGINATION");
  }
  const paths = new Set<string>();
  for (const row of rows) {
    paths.add(centerPath(row.organization.slug));
    // getPublicFormation resolves only publicSlug, never the internal slug.
    if (row.publicSlug) paths.add(formationPath(row.organization.slug, row.publicSlug));
  }
  return [...paths].sort();
}
