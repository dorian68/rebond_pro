import type { ReactNode } from "react";
import { sitePageMetadata } from "@/lib/site-metadata";

export const metadata = sitePageMetadata({
  title: "Espace partenaires centres — Le Bon Rebond",
  description: "Présentez vos formations, centralisez votre activité et recevez des demandes depuis Le Bon Rebond.",
  path: "/centres",
});

export default function Layout({ children }: { children: ReactNode }) { return children; }
