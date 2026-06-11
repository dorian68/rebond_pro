import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

const benefits = [
  { icon: SlidersHorizontal, title: "Comparez plus clairement", text: "Filtrez par thème, niveau, modalité et localisation." },
  { icon: ShieldCheck, title: "Identifiez les bons partenaires", text: "Consultez les centres, leurs formateurs et leurs offres publiées." },
  { icon: Users, title: "Entrez directement en relation", text: "Votre demande arrive dans le suivi du centre concerné." },
];

export default function FormationPage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 rounded-full">Je sais où je veux aller</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Trouvez la formation qui vous ouvre les bonnes portes
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-9">
            Le Bon Rebond vous aide à identifier une formation adaptée et à entrer en relation avec le bon centre partenaire.
          </p>
          <Link href="/marketplace">
            <Button size="lg" className="text-lg px-8 h-14">
              <Search className="w-5 h-5" /> Trouver ma formation
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Trop de formations, pas assez de clarté</h2>
          <p className="text-muted-foreground text-lg">
            Choisir une formation ne devrait pas dépendre d’une liste interminable ou d’une promesse commerciale difficile à vérifier.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="h-full shadow-soft">
              <CardContent className="p-7">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">Comment ça marche ?</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                "Vous décrivez votre projet ou recherchez un métier",
                "Vous explorez les formations et centres adaptés",
                "Vous échangez directement avec le centre partenaire",
                "Vous démarrez un parcours cohérent avec votre avenir",
              ].map((step, i) => (
                <Card key={step} className="shadow-soft">
                  <CardContent className="p-6 flex gap-4 items-start">
                    <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                    <p className="font-medium leading-relaxed">{step}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Vous hésitez encore sur la direction ?</h2>
        <p className="text-muted-foreground text-lg mb-8">Comprendre votre projet avant de choisir une formation peut vous éviter une mauvaise décision.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace"><Button size="lg">Voir les formations <ArrowRight className="w-5 h-5" /></Button></Link>
          <Link href="/bilan-de-competences"><Button size="lg" variant="outline"><CheckCircle2 className="w-5 h-5" /> Faire le point d’abord</Button></Link>
        </div>
      </section>
    </>
  );
}
