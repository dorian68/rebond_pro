"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { Users, Monitor, CheckCircle2, Calendar, ArrowRight, Phone } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

export default function Deroulement() {
  const steps = [
    { num: "1", title: "1er rendez-vous – Découverte", duration: "45 min · Présentiel", desc: "On apprend à se connaître. Nous analysons votre situation actuelle, vos aspirations et vos freins. C'est le moment de poser les bases de votre parcours.", icon: Users },
    { num: "2", title: "2ème rendez-vous – Exploration approfondie", duration: "45 min", desc: "Bilan de compétences approfondi : vos talents, vos valeurs, vos motivations. On explore ensemble les pistes professionnelles qui vous correspondent.", icon: Monitor },
    { num: "3", title: "Espace personnel en ligne", duration: "À votre rythme", desc: "3 activités en ligne pour approfondir votre réflexion entre les séances : tests, exercices guidés et auto-évaluation.", icon: Monitor },
    { num: "4", title: "3ème rendez-vous – Bilan final", duration: "1h", desc: "Remise de vos livrables : synthèse personnalisée, plan d'action concret, recommandations de formation et suivi post-bilan.", icon: Calendar },
  ];

  return (
    <>
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Votre parcours</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Déroulement & Programme</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              24 heures d'accompagnement sur 8 à 10 semaines. Un rythme adapté à votre vie.
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

      {/* Steps */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto space-y-6">
          {steps.map((step, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className="shadow-soft hover:shadow-turquoise transition-all duration-300">
                <CardContent className="p-6 flex gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-display font-bold text-xl shadow-turquoise">
                    {step.num}
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-lg">{step.title}</h2>
                    <span className="text-sm text-primary font-medium">{step.duration}</span>
                    <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Programme officiel */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-foreground mb-8 text-center">Programme officiel</h2>
            <Card className="border-accent/30 shadow-gold">
              <CardContent className="p-8">
                <div className="grid sm:grid-cols-3 gap-6 mb-8">
                  {[
                    { label: "Durée totale", value: "24 heures" },
                    { label: "Sur", value: "8 à 10 semaines" },
                    { label: "Format", value: "100% individuel" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 bg-muted/50 rounded-xl">
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className="font-display font-bold text-xl text-foreground mt-1">{item.value}</div>
                    </div>
                  ))}
                </div>
                <h3 className="font-display font-semibold text-lg mb-4">Modalités</h3>
                <ul className="space-y-3">
                  {[
                    "Entretiens individuels en présentiel et/ou distanciel",
                    "Travaux guidés entre les séances",
                    "Activités en ligne sur votre espace personnel",
                    "Cadre réglementaire respecté (article L.6313-4 du Code du travail)",
                    "Secret professionnel garanti",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display text-3xl font-bold mb-4">Prêt à commencer ?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Link href="/tarifs"><Button size="lg">Voir les tarifs <ArrowRight className="ml-2 w-5 h-5" /></Button></Link>
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
