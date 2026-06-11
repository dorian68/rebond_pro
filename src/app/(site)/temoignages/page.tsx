"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { Star, Phone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

const testimonials = [
  { name: "Marie-Line D.", before: "Agent administratif", after: "Formatrice en insertion", quote: "J'avais perdu le sens de mon travail après 15 ans dans la fonction publique. Le Bon Rebond m'a aidée à me redécouvrir et j'ai pu entamer une reconversion vers la formation.", stars: 5 },
  { name: "Kévin M.", before: "Technicien", after: "En formation développeur web", quote: "Après mon licenciement, j'étais complètement perdu. Le bilan m'a redonné confiance et surtout un vrai plan avec des formations concrètes.", stars: 5 },
  { name: "Nathalie S.", before: "Comptable", after: "Créatrice d'entreprise", quote: "Je rêvais de me lancer à mon compte mais j'avais peur. Le Bon Rebond m'a sécurisée dans ma démarche avec un accompagnement humain incroyable.", stars: 5 },
  { name: "Jean-Marc P.", before: "Manager grande distribution", after: "Consultant indépendant", quote: "Le bilan m'a permis de prendre du recul et de réaliser que mes compétences valaient bien plus que ce que je pensais. Merci Le Bon Rebond !", stars: 5 },
  { name: "Sabrina L.", before: "Assistante de direction", after: "Responsable RH", quote: "Grâce au bilan, j'ai pu négocier une mobilité interne et évoluer vers un poste qui me correspond vraiment. Le CPF a tout financé.", stars: 5 },
  { name: "Thierry B.", before: "Ouvrier BTP", after: "En reconversion – formation sécurité", quote: "Je ne pensais pas que le bilan de compétences était fait pour moi. Mais l'accompagnement local et humain m'a mis en confiance dès le premier RDV.", stars: 5 },
  { name: "Claudine R.", before: "Infirmière", after: "Coach bien-être", quote: "Après 20 ans à l'hôpital, j'avais besoin de changement. Le plan d'action que j'ai reçu était tellement concret que j'ai pu agir tout de suite.", stars: 5 },
  { name: "Yannick F.", before: "Enseignant", after: "Formateur en entreprise", quote: "Le Bon Rebond comprend la réalité guadeloupéenne. C'est un accompagnement local, sincère et vraiment orienté vers l'action.", stars: 5 },
];

export default function Temoignages() {
  return (
    <>
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Témoignages</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Ils ont fait leur <span className="font-script text-accent">rebond</span></h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Des parcours guadeloupéens, comme le vôtre. Chaque histoire est unique, mais toutes partagent un point commun : le passage à l'action.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i % 3} variants={fadeUp}>
              <Card className="h-full border-t-4 border-t-accent shadow-soft hover:shadow-turquoise transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-foreground text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-primary">{t.name[0]}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-muted-foreground text-xs">{t.before} → {t.after}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto border-accent/30 bg-accent/5 shadow-gold">
            <CardContent className="p-8">
              <h2 className="font-display text-2xl font-bold mb-3">Votre histoire pourrait être la <span className="font-script text-accent">prochaine</span></h2>
              <p className="text-muted-foreground mb-6">Faites le premier pas vers votre nouvelle vie professionnelle.</p>
              <Link href="/contact">
                <Button size="lg" className="btn-cta h-14 text-base hover:scale-[1.02] transition-all duration-300 flex flex-col items-center">
                  <span className="flex items-center gap-2"><Phone className="w-5 h-5" />Prendre RDV gratuit 45 min</span>
                  <span className="text-xs opacity-80 font-normal">Sans engagement</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </>
  );
}
