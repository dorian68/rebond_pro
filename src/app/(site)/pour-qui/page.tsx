"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { Briefcase, Search, Rocket, CheckCircle2, Phone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

const profiles = [
  {
    icon: Briefcase,
    title: "Salariés",
    subtitle: "Public & privé",
    borderColor: "border-l-primary",
    pain: "Vous sentez que votre carrière stagne, que le sens s'est perdu, ou que vous méritez mieux. Après des années dans le même poste, vous aspirez à évoluer mais ne savez pas comment.",
    solution: [
      "Identifier vos compétences transférables",
      "Explorer des pistes d'évolution réalistes",
      "Construire un plan de reconversion sécurisé",
      "Repartir avec un parcours de formation concret",
    ],
    cta: "Les options de financement sont étudiées selon votre situation",
  },
  {
    icon: Search,
    title: "Demandeurs d'emploi",
    subtitle: "En transition",
    borderColor: "border-l-secondary",
    pain: "Le chômage peut être déstabilisant. Vous cherchez à vous réorienter, à découvrir de nouvelles opportunités, ou simplement à reprendre confiance en vos capacités.",
    solution: [
      "Redécouvrir vos talents et compétences cachées",
      "Identifier des secteurs qui recrutent en Guadeloupe",
      "Définir un projet professionnel motivant",
      "Accéder à des formations adaptées au marché local",
    ],
    cta: "Un conseiller vous aide à identifier les dispositifs réellement accessibles",
  },
  {
    icon: Rocket,
    title: "Entrepreneurs & Porteurs de projet",
    subtitle: "Créateurs d'avenir",
    borderColor: "border-l-accent",
    pain: "Vous avez une idée, un rêve entrepreneurial, mais vous hésitez à franchir le pas. Vous voulez valider votre projet avant de tout quitter.",
    solution: [
      "Valider votre idée de manière structurée",
      "Identifier vos atouts entrepreneuriaux",
      "Sécuriser votre transition professionnelle",
      "Construire une feuille de route réaliste",
    ],
    cta: "Sécurisez votre projet avant de vous lancer",
  },
];

export default function Cibles() {
  return (
    <>
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Pour qui ?</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Le Bon Rebond s'adresse à <span className="font-script text-[#A64F20]">vous</span></h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Que vous soyez salarié, en recherche d'emploi ou entrepreneur, votre parcours commence ici.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-8">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p className="text-primary-foreground text-lg font-medium">Votre 1er RDV est gratuit et sans engagement</p>
            <Link href="/contact">
              <Button className="btn-cta hover:scale-[1.02] transition-all duration-300">
                <Phone className="w-4 h-4 mr-2" />
                Prendre RDV gratuit 45 min
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="space-y-12 max-w-4xl mx-auto">
          {profiles.map((profile, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className={`overflow-hidden shadow-soft hover:shadow-turquoise transition-all duration-300 border-l-4 ${profile.borderColor}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    <div className="bg-muted/50 p-8 lg:w-72 flex flex-col items-center justify-center text-center">
                      <profile.icon className="w-10 h-10 mb-3 text-primary" />
                      <h2 className="font-display font-bold text-2xl text-foreground">{profile.title}</h2>
                      <span className="text-sm text-muted-foreground">{profile.subtitle}</span>
                    </div>
                    <div className="p-8 flex-1">
                      <p className="text-muted-foreground leading-relaxed mb-6">{profile.pain}</p>
                      <h3 className="font-display font-semibold mb-3">Comment Le Bon Rebond vous aide :</h3>
                      <ul className="space-y-2 mb-6">
                        {profile.solution.map((s, j) => (
                          <li key={j} className="flex items-start gap-3 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Link href="/contact">
                          <Button className="bg-primary text-primary-foreground shadow-turquoise">
                            <Phone className="mr-2 w-4 h-4" /> Prendre rendez-vous
                          </Button>
                        </Link>
                        <span className="text-sm text-muted-foreground">{profile.cta}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
