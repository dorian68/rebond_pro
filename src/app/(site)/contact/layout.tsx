import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";
import { StructuredData } from "@/components/site/StructuredData";
import { breadcrumbData } from "@/lib/site-seo";

export const metadata = sitePageMetadata({
  title: "Contact : Le Bon Rebond",
  description: "Parlez-nous de votre projet d'orientation, de reconversion, de formation ou de partenariat.",
  path: "/contact",
});

export default function Layout({ children }: { children: ReactNode }) {
  return <><StructuredData data={breadcrumbData([{ name: "Accueil", path: "/" }, { name: "Contact", path: "/contact" }])} />{children}</>;
}
