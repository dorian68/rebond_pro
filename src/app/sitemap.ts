import type { MetadataRoute } from "next";
import { blogArticles } from "@/content/blog-data";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.APP_PUBLIC_URL ?? "https://lebonrebond.fr").replace(/\/$/, "");
  return ROUTES.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "/blog" || path === "/marketplace" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/legal/") ? 0.2 : 0.8,
  }));
}
