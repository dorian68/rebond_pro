import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "Espace partenaires centres, Le Bon Rebond",
  description: "Présentez vos formations, centralisez votre activité et recevez des demandes depuis Le Bon Rebond.",
  path: "/centres",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "Centres de formation", path: "/centres" }])} />{children}</>;
}
