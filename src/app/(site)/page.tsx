"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, Shield, Users, Clock, MapPin,
  Compass, Lightbulb, Rocket, Star, Heart,
  Award, Phone, Building2, CalendarRange, Sparkles,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium rounded-full">
                Finançable CPF · 100% individuel · En Guadeloupe
              </Badge>
            </motion.div>

            <motion.h1
              initial="hidden" animate="visible" custom={1} variants={fadeUp}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              Clarifiez. Décidez.{" "}
              <span className="font-script text-accent text-5xl md:text-6xl lg:text-7xl">Avancez.</span>
            </motion.h1>

            <motion.p
              initial="hidden" animate="visible" custom={2} variants={fadeUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Le premier bilan de compétences en Guadeloupe qui vous mène de la réflexion à l'action.
              Repartez avec un projet clair <strong className="text-foreground">ET</strong> un plan de formation concret.
            </motion.p>

            <motion.div
              initial="hidden" animate="visible" custom={3} variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/contact">
                <Button size="lg" className="w-full sm:w-auto btn-cta text-lg px-8 h-14 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center">
                  <span className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Prendre rendez-vous gratuit 45 min
                  </span>
                  <span className="text-xs opacity-80 font-normal">En Guadeloupe ou en visio · Sans engagement</span>
                </Button>
              </Link>
              <Link href="/contact#eligibilite">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-base px-8">
                  Vérifier mon éligibilité CPF
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-background" style={{ clipPath: "polygon(0 60%, 100% 0%, 100% 100%, 0% 100%)" }} />
      </section>

      {/* Pain Points */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Vous vous reconnaissez ?</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Peu importe où vous en êtes, Rebond Pro vous aide à trouver votre voie.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Compass, title: "Envie de changement", desc: "Vous sentez qu'il est temps d'évoluer, mais vous ne savez pas vers quoi.", borderColor: "border-l-primary" },
            { icon: Heart, title: "Perte de sens", desc: "Votre travail ne vous motive plus. Vous méritez mieux.", borderColor: "border-l-destructive" },
            { icon: Rocket, title: "Reconversion", desc: "Vous rêvez d'un nouveau métier mais avez peur de vous lancer.", borderColor: "border-l-secondary" },
            { icon: Lightbulb, title: "Projet entrepreneurial", desc: "Vous avez une idée mais besoin de valider et sécuriser votre projet.", borderColor: "border-l-accent" },
          ].map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className={`h-full shadow-soft hover:shadow-turquoise transition-all duration-300 border-l-4 ${item.borderColor}`}>
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mid-page CTA Banner */}
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

      {/* USP Comparison */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Ce qui nous rend <span className="font-script text-accent">différents</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Chez Rebond Pro, vous ne repartez pas juste avec un document. Vous repartez avec <strong className="text-foreground">une feuille de route</strong>.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}>
              <Card className="h-full border-border/30 bg-card/50 shadow-soft">
                <CardContent className="p-8">
                  <h3 className="font-display font-semibold text-xl mb-6 text-muted-foreground">Bilan classique</h3>
                  <ul className="space-y-4">
                    {[
                      "Document de synthèse",
                      "Pistes de réflexion génériques",
                      "Pas de suite concrète",
                      "Vous repartez seul(e)",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
              <Card className="h-full border-accent/40 shadow-gold bg-card">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <h3 className="font-display font-semibold text-xl text-primary">Rebond Pro</h3>
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-xs rounded-full">Innovation</Badge>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "Projet professionnel clair et réaliste",
                      "Plan d'action étape par étape",
                      "Parcours de formation recommandé",
                      "Suivi post-bilan personnalisé",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bridge visualization */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp} className="mt-14 max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-2 md:gap-4 bg-card rounded-2xl p-6 shadow-soft border border-primary/10">
              {["Bilan", "Plan d'action", "Formation", "Action"].map((step, i) => (
                <div key={i} className="flex items-center gap-2 md:gap-4">
                  <div className="text-center">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mx-auto mb-1 ${
                      i === 3 ? "bg-accent text-accent-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      <span className="font-bold text-sm">{i + 1}</span>
                    </div>
                    <span className="text-xs md:text-sm font-medium">{step}</span>
                  </div>
                  {i < 3 && <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Numbers */}
      <section className="py-20 lg:py-28 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {[
              { icon: Award, value: "1 200€", label: "TTC – finançable CPF" },
              { icon: Clock, value: "24h", label: "sur 8 à 10 semaines" },
              { icon: Users, value: "100%", label: "individuel & personnalisé" },
              { icon: MapPin, value: "Guadeloupe", label: "présentiel + visio" },
            ].map((item, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                className="text-center p-6 rounded-2xl bg-primary-foreground/10"
              >
                <item.icon className="w-8 h-8 text-accent mx-auto mb-3" />
                <div className="font-display font-bold text-2xl md:text-3xl">{item.value}</div>
                <div className="text-primary-foreground/70 text-sm mt-1">{item.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              { icon: Shield, label: "Finançable CPF" },
              { icon: Shield, label: "Secret professionnel" },
              { icon: MapPin, label: "Accompagnement local" },
            ].map((badge, i) => (
              <Badge key={i} variant="outline" className="px-4 py-2 text-sm border-primary-foreground/30 text-primary-foreground gap-2 rounded-full">
                <badge.icon className="w-4 h-4 text-accent" />
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Ils ont fait leur <span className="font-script text-accent">rebond</span></h2>
            <p className="text-muted-foreground text-lg">Des parcours guadeloupéens, comme le vôtre.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Marie-Line", role: "Salariée, fonction publique", quote: "J'avais perdu le sens de mon travail après 15 ans. Rebond Pro m'a aidée à me redécouvrir et à construire un plan concret pour ma reconversion.", stars: 5 },
              { name: "Kévin", role: "Demandeur d'emploi", quote: "Après mon licenciement, j'étais perdu. Le bilan m'a redonné confiance et surtout un vrai plan d'action avec des formations adaptées.", stars: 5 },
              { name: "Nathalie", role: "Entrepreneure", quote: "Je voulais valider mon projet de création d'entreprise. Rebond Pro m'a sécurisée dans ma démarche avec un accompagnement humain et local.", stars: 5 },
            ].map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className="h-full border-t-4 border-t-accent border-border/30 shadow-soft hover:shadow-turquoise transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-foreground text-sm leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-display font-bold text-primary">{t.name[0]}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-muted-foreground text-xs">{t.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pont B2B — vers le cockpit des centres de formation */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="max-w-5xl mx-auto">
          <Card className="overflow-hidden border-primary/15 shadow-soft">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2">
                <div className="bg-gradient-section p-8 md:p-12 flex flex-col justify-center">
                  <Badge className="mb-4 w-fit bg-secondary/15 text-secondary border-secondary/30 rounded-full">
                    <Building2 className="w-3.5 h-3.5 mr-1.5" /> Espace professionnel
                  </Badge>
                  <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Vous êtes un <span className="font-script text-secondary">centre de formation</span> ?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Au-delà de l'accompagnement des particuliers, Rebond Pro édite un cockpit SaaS complet
                    pour piloter votre organisme : formations, sessions, formateurs, disponibilités, planning,
                    CRM, documents et catalogue public.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/centres">
                      <Button size="lg" className="w-full sm:w-auto">
                        Découvrir le cockpit <ArrowRight className="ml-2 w-5 h-5" />
                      </Button>
                    </Link>
                    <Link href="/marketplace">
                      <Button size="lg" variant="outline" className="w-full sm:w-auto">
                        Voir le catalogue
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="p-8 md:p-12 grid sm:grid-cols-2 gap-5 content-center">
                  {[
                    { icon: CalendarRange, title: "Planning fiable", desc: "Conflits repérés, formateurs confirmés." },
                    { icon: Users, title: "CRM formation", desc: "Demandes converties en inscriptions." },
                    { icon: Sparkles, title: "Assistant intégré", desc: "Relances et recommandations utiles." },
                    { icon: Building2, title: "Profil & catalogue", desc: "Votre fiche centre, visible du réseau." },
                  ].map((f, i) => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-display font-semibold text-base">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 pb-20 lg:pb-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="bg-primary rounded-3xl p-8 md:p-14 text-center text-primary-foreground max-w-3xl mx-auto shadow-turquoise"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Prêt à donner un nouveau cap à votre vie professionnelle ?
          </h2>
          <p className="opacity-70 text-lg mb-8 max-w-xl mx-auto">
            Votre premier rendez-vous est gratuit et sans engagement. Parlons de votre projet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="w-full sm:w-auto btn-cta text-lg px-8 h-14 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center">
                <span className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Prendre RDV gratuit 45 min
                </span>
                <span className="text-xs opacity-80 font-normal">Sans engagement</span>
              </Button>
            </Link>
            <Link href="/contact#eligibilite">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                Vérifier mon éligibilité CPF
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
