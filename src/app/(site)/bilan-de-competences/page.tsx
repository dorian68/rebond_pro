import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Map, Phone, Route, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

const outcomes = [
  "Une direction professionnelle claire et réaliste",
  "Une meilleure compréhension de vos forces et contraintes",
  "Des pistes métiers et formations concrètes",
  "Un plan d’action priorisé sur 3 à 6 mois",
];

export default function BilanDeCompetencesPage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-accent/15 text-accent border-accent/30 rounded-full">Je suis perdu ou j’hésite</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Faites le point sur votre carrière et retrouvez une direction claire
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-9">
            Le Bilan Bon Rebond vous aide à sortir du flou professionnel et à construire une trajectoire claire et concrète en quelques semaines.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact"><Button size="lg" className="btn-cta text-lg h-14"><Phone className="w-5 h-5" /> Commencer mon bilan</Button></Link>
            <Link href="/methode"><Button size="lg" variant="outline">Découvrir la méthode Rebond Clarté <ArrowRight className="w-5 h-5" /></Button></Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-center">
          <div>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Comprendre avant de choisir</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-5">Vous n’êtes pas perdu. Vous êtes entre deux étapes.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Lorsque votre travail ne vous correspond plus, le premier besoin n’est pas une nouvelle liste de métiers. C’est une méthode pour prendre une décision solide.
            </p>
            <p className="font-semibold text-primary">
              Le Bon Rebond n’est pas un test de personnalité. C’est une méthode de décision professionnelle.
            </p>
          </div>
          <Card className="shadow-gold border-accent/30">
            <CardContent className="p-8">
              <h3 className="font-display text-2xl font-bold mb-5">Ce que vous obtenez concrètement</h3>
              <ul className="space-y-4">
                {outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">La méthode Rebond Clarté</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {[
              { icon: Compass, title: "Clarifier", text: "Comprendre la situation et le blocage." },
              { icon: ShieldCheck, title: "Identifier", text: "Forces, valeurs et contraintes." },
              { icon: Map, title: "Explorer", text: "Métiers et formations possibles." },
              { icon: Route, title: "Décider", text: "Choisir une direction réaliste." },
              { icon: CheckCircle2, title: "Agir", text: "Construire la feuille de route." },
            ].map((phase, i) => (
              <Card key={phase.title} className="h-full shadow-soft">
                <CardContent className="p-5 text-center">
                  <span className="text-sm font-bold text-primary">0{i + 1}</span>
                  <phase.icon className="w-7 h-7 text-accent mx-auto my-4" />
                  <h3 className="font-display font-semibold text-lg mb-2">{phase.title}</h3>
                  <p className="text-muted-foreground text-sm">{phase.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ne restez pas dans le flou</h2>
        <p className="text-muted-foreground text-lg mb-8">Un bon choix professionnel commence par une bonne compréhension de soi.</p>
        <Link href="/contact"><Button size="lg" className="btn-cta text-lg h-14"><Phone className="w-5 h-5" /> Parler à un conseiller</Button></Link>
      </section>
    </>
  );
}
