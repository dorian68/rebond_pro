import type { MetadataRoute } from "next";
import { blogArticles } from "@/content/blog-data";
import { siteUrl } from "@/lib/site-seo";
import { logger } from "@/lib/logger";
import { getPublicCatalogSitemapPaths } from "@/server/marketplace-seo";

// Query the published catalogue at request time, not during a build without DB.
export const dynamic = "force-dynamic";

const ROUTES = [
  "",
  "/formation",
  "/bilan-de-competences",
  "/bilan-orientation",
  "/methode",
  "/a-propos",
  "/blog",
  "/contact",
  "/opportunites/service-civique-sainte-lucie",
  "/centres",
  "/marketplace",
  "/legal/mentions",
  "/legal/cgu",
  "/legal/confidentialite",
  ...blogArticles.map((article) => `/blog/${article.slug}`),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let catalogPaths: string[] = [];
  try {
    catalogPaths = await getPublicCatalogSitemapPaths();
  } catch (error) {
    // Keep the known public pages discoverable when the catalogue is unavailable.
    // Do not log Prisma messages, connection strings, or unpublished records.
    logger.warn("public_sitemap_catalogue_unavailable", { errorType: error instanceof Error ? error.name : "UnknownError" });
  }
  return [...new Set([...ROUTES, ...catalogPaths])].map((path) => ({
    url: siteUrl(path || "/"),
    changeFrequency: path === "/blog" || path === "/marketplace" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/legal/") ? 0.2 : 0.8,
  }));
}
