import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.APP_PUBLIC_URL ?? "https://lebonrebond.fr").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/dashboard/", "/parametres/", "/espace/", "/trainer/", "/onboarding/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
