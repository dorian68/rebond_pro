import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Map, Route, Search, Target } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

const phases = [
  { icon: Compass, title: "Clarifier", text: "Comprendre votre situation, le doute actuel, vos attentes et vos contraintes." },
  { icon: Search, title: "Identifier", text: "Faire émerger vos compétences, forces, valeurs, motivations et besoins." },
  { icon: Map, title: "Explorer", text: "Étudier des métiers, environnements et formations compatibles avec votre profil." },
  { icon: Target, title: "Décider", text: "Choisir une direction claire, réaliste et suffisamment motivante pour agir." },
  { icon: Route, title: "Plan d’action", text: "Construire une feuille de route concrète sur les trois à six prochains mois." },
];

export default function MethodePage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-accent/15 text-[#8E3E17] border-accent/30 rounded-full">Notre méthode propriétaire</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">La méthode Rebond Clarté</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
            Une méthode de décision professionnelle en cinq étapes pour passer du doute à une direction puis à l’action.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto space-y-5">
          {phases.map((phase, i) => (
            <Card key={phase.title} className="shadow-soft border-l-4 border-l-primary">
              <CardContent className="p-6 md:p-8 flex gap-5 items-start">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <phase.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8E3E17]">Étape {i + 1}</span>
                  <h2 className="font-display text-2xl font-bold mt-1 mb-2">{phase.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{phase.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-section py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-5">Vous repartez avec une décision et une feuille de route</h2>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {["Projet principal", "Alternatives sécurisées", "Formations adaptées", "Plan d’action 3 à 6 mois"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full bg-card border border-primary/15 px-4 py-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-secondary" /> {item}
              </span>
            ))}
          </div>
          <Link href="/contact"><Button size="lg" className="btn-cta">Commencer mon bilan <ArrowRight className="w-5 h-5" /></Button></Link>
        </div>
      </section>
    </>
  );
}
