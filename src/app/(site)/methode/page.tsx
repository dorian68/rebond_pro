"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Zap, Target, FileText, BookOpen, Phone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

export default function Methode() {
  const phases = [
    {
      phase: "Phase 1",
      title: "Clarification",
      hours: "4h",
      borderColor: "border-l-primary",
      items: ["Analyse de votre situation actuelle", "Définition de vos objectifs", "Identification de vos attentes profondes", "Cadrage du parcours personnalisé"],
    },
    {
      phase: "Phase 2",
      title: "Exploration",
      hours: "14h",
      borderColor: "border-l-secondary",
      items: ["Inventaire de vos compétences et talents", "Exploration de vos motivations et valeurs", "Analyse de pistes professionnelles réalistes", "Tests et mises en situation"],
    },
    {
      phase: "Phase 3",
      title: "Décision & Plan d'action",
      hours: "6h",
      borderColor: "border-l-accent",
      items: ["Projet principal + alternatives sécurisées", "Étapes concrètes et calendrier", "Plan de montée en compétences", "Synthèse écrite personnalisée"],
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Notre approche</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">La méthode <span className="font-script text-accent">« Action »</span></h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un parcours en 3 phases pour passer de la réflexion à l'action concrète. 24 heures d'accompagnement 100% individuel.
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

      {/* Timeline */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto space-y-8">
          {phases.map((phase, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className={`shadow-soft hover:shadow-turquoise transition-all duration-300 overflow-hidden border-l-4 ${phase.borderColor}`}>
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="bg-muted/50 p-6 md:p-8 md:w-64 flex flex-col justify-center items-center text-center">
                      <span className="text-sm font-medium text-muted-foreground">{phase.phase}</span>
                      <h3 className="font-display font-bold text-2xl mt-1 text-foreground">{phase.title}</h3>
                      <span className="text-3xl font-bold mt-2 text-primary">{phase.hours}</span>
                    </div>
                    <div className="p-6 md:p-8 flex-1">
                      <ul className="space-y-3">
                        {phase.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Innovation */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <Badge className="mb-4 bg-accent/15 text-accent border-accent/30 rounded-full">Innovation</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Le pont Bilan → <span className="font-script text-accent">Formation</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              À la fin de votre parcours, vous ne repartez pas juste avec un rapport. Vous repartez avec tout ce qu'il faut pour agir.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Target, title: "Vision claire", desc: "Un projet professionnel défini et réaliste" },
              { icon: FileText, title: "Plan d'action", desc: "Des étapes concrètes avec un calendrier" },
              { icon: BookOpen, title: "Formation recommandée", desc: "Un parcours de montée en compétences" },
              { icon: Zap, title: "Suivi post-bilan", desc: "Un accompagnement qui continue après" },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className="h-full text-center shadow-soft hover:shadow-turquoise transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 lg:py-28 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display text-3xl font-bold mb-4">Envie d'en savoir plus ?</h2>
          <p className="text-muted-foreground text-lg mb-8">Découvrez le déroulement concret de votre parcours.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/deroulement"><Button size="lg">Voir le déroulement <ArrowRight className="ml-2 w-5 h-5" /></Button></Link>
            <Link href="/contact">
              <Button size="lg" className="btn-cta h-14 text-base hover:scale-[1.02] transition-all duration-300 flex flex-col items-center">
                <span className="flex items-center gap-2"><Phone className="w-5 h-5" />Prendre RDV gratuit 45 min</span>
                <span className="text-xs opacity-80 font-normal">Sans engagement</span>
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
