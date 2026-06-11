import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, GraduationCap, Handshake, Heart } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

export default function AProposPage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 rounded-full">Notre mission</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Redonner du sens aux parcours professionnels</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
            Le Bon Rebond est né d’un constat simple : trop de personnes veulent évoluer mais ne savent pas par où commencer.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Un pont entre le doute et l’action</h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-5">
            Entre la surcharge d’informations, les milliers de formations disponibles et le manque d’accompagnement, beaucoup reportent leur décision ou choisissent sans repères suffisants.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Nous réunissons orientation, bilan de compétences et réseau de centres partenaires pour transformer un questionnement professionnel en trajectoire concrète.
          </p>
        </div>
      </section>

      <section className="bg-gradient-section py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">Ce que nous voulons rendre plus simple</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              { icon: Compass, title: "Trouver sa direction", text: "Sortir du flou avec une méthode claire." },
              { icon: GraduationCap, title: "Choisir sa formation", text: "Accéder à des parcours adaptés au projet." },
              { icon: Handshake, title: "Connecter les bons acteurs", text: "Particuliers, consultants et centres partenaires." },
              { icon: Heart, title: "Préserver l’humain", text: "Guider sans réduire la transition à un algorithme." },
            ].map((item) => (
              <Card key={item.title} className="h-full shadow-soft">
                <CardContent className="p-6">
                  <item.icon className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Chaque parcours mérite un bon rebond</h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link href="/marketplace"><Button size="lg">Trouver une formation <ArrowRight className="w-5 h-5" /></Button></Link>
          <Link href="/bilan-de-competences"><Button size="lg" className="btn-cta"><CheckCircle2 className="w-5 h-5" /> Faire un bilan</Button></Link>
        </div>
      </section>
    </>
  );
}
