import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "Trouver une formation, Le Bon Rebond",
  description: "Explorez des formations publiées par des centres validés et trouvez celle qui correspond à votre projet.",
  path: "/formation",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "Formations", path: "/formation" }])} />{children}</>;
}
