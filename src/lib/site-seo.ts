export const SITE_NAME = "Le Bon Rebond";

export type BreadcrumbItem = { name: string; path: string };

export function siteUrl(path = "/"): string {
  const origin = (process.env.APP_PUBLIC_URL ?? "https://lebonrebond.fr").replace(/\/$/, "");
  return new URL(path, `${origin}/`).toString();
}

/** Facts already displayed on the public site, without inferred credentials. */
export function siteIdentity() {
  const organizationId = siteUrl("/#publisher");
  const brandId = siteUrl("/#brand");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "OPTIQUANT IA",
        legalName: "OPTIQUANT IA",
        url: "https://www.optiquant-ia.com/",
        brand: { "@id": brandId },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Information sur Le Bon Rebond",
          email: "contact.lebonrebond@gmail.com",
          telephone: "+33783960192",
          availableLanguage: "fr",
        },
      },
      {
        "@type": "Brand",
        "@id": brandId,
        name: SITE_NAME,
        url: siteUrl(),
        logo: siteUrl("/brand/logo-mark-le-bon-rebond.png"),
      },
      {
        "@type": "WebSite",
        "@id": siteUrl("/#website"),
        name: SITE_NAME,
        alternateName: "LeBonRebond",
        url: siteUrl(),
        inLanguage: "fr-FR",
        about: { "@id": brandId },
        description: "Le Bon Rebond accompagne les personnes en transition professionnelle dans leur orientation, leur bilan de compétences et leur recherche de formation.",
        publisher: { "@id": organizationId },
      },
    ],
  };
}

export function breadcrumbData(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  };
}

/** Prevent a database-provided label from closing the JSON-LD script element. */
export function jsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function centerPath(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

export function formationPath(orgSlug: string, publicSlug: string): string {
  return `${centerPath(orgSlug)}/f/${encodeURIComponent(publicSlug)}`;
}
