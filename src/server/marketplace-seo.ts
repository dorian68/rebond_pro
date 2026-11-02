import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { publicCatalogSitemapPaths, publicCatalogSitemapQuery } from "@/lib/catalog-sitemap";

/** Uses the same publication gate as the public formation and centre pages. */
export const getPublicCatalogSitemapPaths = unstable_cache(
  async () => publicCatalogSitemapPaths(await prisma.formation.findMany(publicCatalogSitemapQuery)),
  ["marketplace-sitemap-paths"],
  { revalidate: 300, tags: ["marketplace"] },
);
