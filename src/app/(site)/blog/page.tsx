import Link from "next/link";
import { ArrowRight, BookOpen, Compass, GraduationCap } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

const articles = [
  {
    icon: Compass,
    category: "Orientation",
    title: "Comment savoir si vous avez besoin d’un bilan de compétences ?",
    text: "Les signaux qui montrent qu’il est temps de faire le point avant de prendre une décision professionnelle.",
  },
  {
    icon: GraduationCap,
    category: "Formation",
    title: "Choisir une formation sans perdre du temps ni de l’argent",
    text: "Les critères essentiels pour vérifier qu’une formation correspond réellement à votre projet.",
  },
  {
    icon: BookOpen,
    category: "Reconversion",
    title: "Passer du désir de changement à un plan d’action réaliste",
    text: "Une méthode simple pour transformer une envie de reconversion en prochaines étapes concrètes.",
  },
];

export default function BlogPage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 rounded-full">Ressources</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Des repères pour mieux décider</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto">
            Orientation, formation et reconversion : des contenus pratiques pour avancer avec plus de clarté.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {articles.map((article) => (
            <Card key={article.title} className="h-full shadow-soft">
              <CardContent className="p-7">
                <article.icon className="w-8 h-8 text-primary mb-5" />
                <span className="text-xs uppercase tracking-wider font-bold text-accent">{article.category}</span>
                <h2 className="font-display text-xl font-semibold my-3">{article.title}</h2>
                <p className="text-muted-foreground leading-relaxed mb-5">{article.text}</p>
                <span className="text-sm font-semibold text-primary">Article en préparation</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-section py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Besoin d’une réponse adaptée à votre situation ?</h2>
          <p className="text-muted-foreground text-lg mb-7">Parlez de votre projet avec un conseiller.</p>
          <Link href="/contact"><Button size="lg" className="btn-cta">Nous contacter <ArrowRight className="w-5 h-5" /></Button></Link>
        </div>
      </section>
    </>
  );
}
