import type { Metadata } from "next";

export function sitePageMetadata(input: { title: string; description: string; path: string }): Metadata {
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      siteName: "Le Bon Rebond",
      locale: "fr_FR",
      type: "website",
      images: [{ url: "/photos/hero-woman.jpg", alt: "Le Bon Rebond" }],
    },
    twitter: { card: "summary_large_image", title: input.title, description: input.description, images: ["/photos/hero-woman.jpg"] },
  };
}
