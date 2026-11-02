import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "À propos, Le Bon Rebond",
  description: "Découvrez la vision, l'équipe et les principes qui structurent Le Bon Rebond.",
  path: "/a-propos",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "À propos", path: "/a-propos" }])} />{children}</>;
}
