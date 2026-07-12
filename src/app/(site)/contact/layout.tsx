import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";

export const metadata = sitePageMetadata({
  title: "Contact — Le Bon Rebond",
  description: "Parlez-nous de votre projet d'orientation, de reconversion, de formation ou de partenariat.",
  path: "/contact",
});

export default function Layout({ children }: { children: ReactNode }) { return children; }
