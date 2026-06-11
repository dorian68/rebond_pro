import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Compass, GraduationCap, Users } from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

export default function BilanOrientationPage() {
  return (
    <>
      <section className="bg-gradient-hero py-20 lg:py-28">
        <div className="container mx-auto px-4 text-center">
          <Badge className="mb-5 bg-secondary/15 text-secondary border-secondary/30 rounded-full">Élèves & étudiants</Badge>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Choisir une orientation sans avancer au hasard</h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-9">
            Un accompagnement pour mieux se connaître, explorer les possibilités et prendre une décision d’orientation éclairée.
          </p>
          <Link href="/contact"><Button size="lg" className="btn-cta text-lg h-14">Échanger sur l’orientation <ArrowRight className="w-5 h-5" /></Button></Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-12">Un cadre pour décider avec confiance</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: Compass, title: "Mieux se connaître", text: "Intérêts, motivations, talents et manière d’apprendre." },
            { icon: BookOpen, title: "Explorer les options", text: "Filières, métiers et parcours de formation possibles." },
            { icon: GraduationCap, title: "Choisir et préparer", text: "Une direction argumentée et les prochaines étapes à réaliser." },
          ].map((item) => (
            <Card key={item.title} className="h-full shadow-soft">
              <CardContent className="p-7 text-center">
                <item.icon className="w-9 h-9 text-secondary mx-auto mb-4" />
                <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gradient-section py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="shadow-soft">
              <CardContent className="p-8">
                <Users className="w-8 h-8 text-primary mb-4" />
                <h2 className="font-display text-2xl font-bold mb-4">Pour qui ?</h2>
                <ul className="space-y-3">
                  {["Collégiens et lycéens qui hésitent entre plusieurs voies", "Étudiants qui envisagent une réorientation", "Familles qui souhaitent sécuriser une décision importante"].map((item) => (
                    <li key={item} className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0" /> {item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="shadow-gold border-accent/30">
              <CardContent className="p-8">
                <h2 className="font-display text-2xl font-bold mb-4">Le résultat attendu</h2>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  L’objectif n’est pas de choisir à la place du jeune, mais de lui donner les repères nécessaires pour faire un choix éclairé et assumé.
                </p>
                <Link href="/contact"><Button className="btn-cta">Demander un premier échange <ArrowRight className="w-5 h-5" /></Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
