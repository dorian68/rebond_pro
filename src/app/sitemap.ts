import type { MetadataRoute } from "next";

const ROUTES = [
  "",
  "/formation",
  "/bilan-de-competences",
  "/bilan-orientation",
  "/methode",
  "/a-propos",
  "/blog",
  "/contact",
  "/centres",
  "/marketplace",
  "/legal/mentions",
  "/legal/cgu",
  "/legal/confidentialite",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.APP_PUBLIC_URL ?? "https://lebonrebond.optiquant-ia.com").replace(/\/$/, "");
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: path === "/blog" || path === "/marketplace" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/legal/") ? 0.2 : 0.8,
  }));
}
