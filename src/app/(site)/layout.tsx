import type { ReactNode } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingCTA from "@/components/site/FloatingCTA";

/** Layout du site vitrine public (bilan de compétences, B2C).
 *  La classe `.vitrine` active le thème turquoise/or scopé (cf. globals.css)
 *  sans impacter le cockpit B2B. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vitrine min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingCTA />
    </div>
  );
}
