import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "Bilan de compétences, Le Bon Rebond",
  description: "Faites le point sur vos compétences, explorez des pistes réalistes et construisez un plan d'action professionnel.",
  path: "/bilan-de-competences",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "Bilan de compétences", path: "/bilan-de-competences" }])} />{children}</>;
}
