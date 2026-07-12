import type { ReactNode } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import FloatingCTA from "@/components/site/FloatingCTA";
import { AgentDock } from "@/components/agent/AgentDock";

/** Layout du site vitrine public (bilan de compétences, B2C).
 *  La classe `.vitrine` active le thème turquoise/or scopé (cf. globals.css)
 *  sans impacter le cockpit B2B. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="vitrine min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <aside aria-label="Aide et contact">
        <FloatingCTA />
        {/* Bouton chatbot aux couleurs de la vitrine (turquoise/teal — DA du site) */}
        <AgentDock
          bottomOffset={92}
          accentGradient="linear-gradient(140deg, hsl(170 57% 39%), hsl(183 100% 23%))"
          accentShadow="hsl(183 100% 23% / 0.45)"
        />
      </aside>
    </div>
  );
}
