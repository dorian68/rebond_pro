import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "Bilan d'orientation, Le Bon Rebond",
  description: "Un accompagnement pour aider collégiens, lycéens et étudiants à choisir une orientation claire et réaliste.",
  path: "/bilan-orientation",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "Bilan d'orientation", path: "/bilan-orientation" }])} />{children}</>;
}
