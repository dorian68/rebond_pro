import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";

export const metadata = sitePageMetadata({
  title: "Trouver une formation — Le Bon Rebond",
  description: "Explorez des formations publiées par des centres validés et trouvez celle qui correspond à votre projet.",
  path: "/formation",
});

export default function Layout({ children }: { children: ReactNode }) { return children; }
