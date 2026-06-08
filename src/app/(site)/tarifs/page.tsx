"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { CheckCircle2, Shield, ArrowRight, Phone, CreditCard, Building2, Wallet } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

export default function Tarifs() {
  return (
    <>
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Tarifs & Financements</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Investissez dans votre <span className="font-script text-accent">avenir</span></h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Un accompagnement premium, accessible grâce au CPF. Votre employeur n'a pas à être informé.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* CPF */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
            <Card className="h-full border-t-4 border-t-accent shadow-gold relative overflow-hidden">
              <CardContent className="p-8">
                <Badge className="mb-4 bg-accent/15 text-accent border-accent/30 rounded-full">Recommandé</Badge>
                <h3 className="font-display font-bold text-2xl mb-2">Offre CPF</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-display font-bold text-4xl text-primary">1 200€</span>
                  <span className="text-muted-foreground">TTC</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">Programme complet – 24h sur 8 à 10 semaines</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "24h d'accompagnement individuel",
                    "3 phases complètes (Clarification, Exploration, Action)",
                    "Espace personnel en ligne",
                    "Synthèse personnalisée écrite",
                    "Plan d'action concret",
                    "Recommandations de formation",
                    "Suivi post-bilan",
                    "Présentiel + visio",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact#eligibilite">
                  <Button className="w-full bg-primary text-primary-foreground shadow-turquoise" size="lg">
                    Vérifier mon éligibilité CPF <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hors CPF */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
            <Card className="h-full shadow-soft">
              <CardContent className="p-8">
                <Badge variant="outline" className="mb-4 rounded-full">Alternative</Badge>
                <h3 className="font-display font-bold text-2xl mb-2">Bilan de Clarté Professionnelle</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-display font-bold text-4xl text-foreground">900€</span>
                  <span className="text-muted-foreground">à 1 200€</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">Pour ceux qui veulent démarrer maintenant, sans attendre</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "10 à 12h d'accompagnement",
                    "4 semaines intensives",
                    "100% individuel",
                    "Présentiel et/ou visio",
                    "Plan d'action personnalisé",
                    "Recommandations de formation",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact">
                  <Button variant="outline" className="w-full" size="lg">
                    <Phone className="mr-2 w-5 h-5" /> Nous contacter
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Financing */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold mb-4">Comment financer votre bilan ?</h2>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: CreditCard, title: "CPF", desc: "Utilisez votre Compte Personnel de Formation. Simple, rapide, sans avance de frais." },
              { icon: Building2, title: "Employeur", desc: "Via le plan de développement des compétences. Votre employeur n'a pas à être informé du contenu." },
              { icon: Wallet, title: "Financement personnel", desc: "Paiement en plusieurs fois possible. Contactez-nous pour en discuter." },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className="h-full text-center shadow-soft hover:shadow-turquoise transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-card rounded-full px-6 py-3 border border-primary/20 shadow-soft">
              <Shield className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Votre employeur n'a pas à être informé de votre démarche</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-16 text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <h2 className="font-display text-3xl font-bold mb-4">Prêt à investir dans votre avenir ?</h2>
          <p className="text-muted-foreground text-lg mb-8">Votre premier rendez-vous est gratuit et sans engagement.</p>
          <Link href="/contact">
            <Button size="lg" className="btn-cta h-14 text-lg hover:scale-[1.02] transition-all duration-300 flex flex-col items-center mx-auto">
              <span className="flex items-center gap-2"><Phone className="w-5 h-5" />Prendre RDV gratuit 45 min</span>
              <span className="text-xs opacity-80 font-normal">Sans engagement</span>
            </Button>
          </Link>
        </motion.div>
      </section>
    </>
  );
}
