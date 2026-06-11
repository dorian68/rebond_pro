"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  Handshake,
  Map,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/site/ui/badge";
import { Button } from "@/components/site/ui/button";
import { Card, CardContent } from "@/components/site/ui/card";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const problems = [
  "Trop d’offres de formation difficiles à comparer",
  "La peur de choisir une direction qui ne vous correspond pas",
  "Le sentiment de tourner en rond sans prochaine étape claire",
  "Le manque d’accompagnement pour passer réellement à l’action",
];

const steps = [
  { icon: MessageCircle, title: "Vous décrivez votre situation", text: "Votre objectif, vos hésitations et le changement que vous envisagez." },
  { icon: Compass, title: "Nous clarifions votre besoin", text: "Formation ciblée ou accompagnement pour construire votre direction." },
  { icon: Handshake, title: "Vous accédez aux bons acteurs", text: "Centres partenaires fiables ou consultant bilan de compétences." },
  { icon: Target, title: "Vous avancez concrètement", text: "Avec une décision, un parcours et une prochaine action visibles." },
];

export default function Home() {
  return (
    <>
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm rounded-full">
                Orientation · Formation · Reconversion
              </Badge>
            </motion.div>
            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              Trouvez votre prochaine direction professionnelle,{" "}
              <span className="font-script text-accent text-5xl md:text-6xl lg:text-7xl">simplement.</span>
            </motion.h1>
            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={fadeUp}
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Le Bon Rebond aide les personnes en transition professionnelle à transformer une période de doute
              en projet clair, puis en parcours de formation ou de reconversion concret.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={fadeUp}
              className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto text-left"
            >
              <Link href="/marketplace" className="block group">
                <Card className="h-full border-primary/25 shadow-soft group-hover:shadow-turquoise group-hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-7 md:p-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                      <Search className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-primary mb-2">Je connais ma prochaine étape</p>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Je cherche une formation</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Explorez des formations et trouvez le centre partenaire adapté à votre projet.
                    </p>
                    <span className="inline-flex items-center gap-2 font-semibold text-primary">
                      Trouver ma formation <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/bilan-de-competences" className="block group">
                <Card className="h-full border-accent/35 shadow-gold group-hover:-translate-y-1 transition-all duration-300">
                  <CardContent className="p-7 md:p-8">
                    <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-5">
                      <Compass className="w-7 h-7 text-accent" />
                    </div>
                    <p className="text-sm font-semibold text-accent mb-2">J’ai besoin d’y voir plus clair</p>
                    <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Je veux faire un bilan</h2>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      Faites le point, choisissez une direction réaliste et repartez avec un plan d’action.
                    </p>
                    <span className="inline-flex items-center gap-2 font-semibold text-accent">
                      Comprendre avant de choisir <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
            <motion.p initial="hidden" animate="visible" custom={4} variants={fadeUp} className="mt-7 text-sm text-muted-foreground">
              Vous n’êtes pas perdu. Vous êtes entre deux étapes.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
          <Badge className="mb-4 bg-accent/15 text-accent border-accent/30 rounded-full">Du doute à la direction</Badge>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Vous savez que vous devez évoluer, mais pas toujours par où commencer
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Les personnes en transition ne manquent pas de solutions. Elles manquent d’une direction fiable.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {problems.map((problem, i) => (
            <motion.div key={problem} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className="h-full shadow-soft border-l-4 border-l-accent">
                <CardContent className="p-6">
                  <CheckCircle2 className="w-6 h-6 text-accent mb-4" />
                  <p className="text-foreground leading-relaxed">{problem}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Comment ça fonctionne ?</Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Un guide simple pour passer du flou à l’action</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {steps.map((step, i) => (
              <motion.div key={step.title} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className="h-full shadow-soft">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="font-display text-3xl font-bold text-primary/20">{i + 1}</span>
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Deux solutions pour faire le bon rebond</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choisissez selon votre niveau de clarté aujourd’hui. Vous pourrez toujours passer de l’un à l’autre.
          </p>
        </motion.div>
        <div className="grid lg:grid-cols-2 gap-7 max-w-5xl mx-auto">
          <Card className="overflow-hidden shadow-turquoise border-primary/20">
            <CardContent className="p-8 md:p-10">
              <BookOpen className="w-9 h-9 text-primary mb-5" />
              <h3 className="font-display text-3xl font-bold mb-3">Trouver une formation adaptée</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Comparez les offres publiées par nos centres partenaires et entrez directement en relation avec eux.
              </p>
              <ul className="space-y-3 mb-7">
                {["Catalogue clair et filtrable", "Centres et formateurs visibles", "Demande ou achat en ligne"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-secondary" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/marketplace"><Button size="lg">Voir les formations <ArrowRight className="w-5 h-5" /></Button></Link>
            </CardContent>
          </Card>

          <Card className="overflow-hidden shadow-gold border-accent/30">
            <CardContent className="p-8 md:p-10">
              <Map className="w-9 h-9 text-accent mb-5" />
              <h3 className="font-display text-3xl font-bold mb-3">Faire le point sur votre carrière</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                La méthode Rebond Clarté vous aide à comprendre, explorer, décider et construire votre feuille de route.
              </p>
              <ul className="space-y-3 mb-7">
                {["Accompagnement humain individuel", "Projet professionnel réaliste", "Plan d’action sur 3 à 6 mois"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-accent" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/bilan-de-competences"><Button size="lg" className="btn-cta">Découvrir le bilan <ArrowRight className="w-5 h-5" /></Button></Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto text-center">
            {[
              { icon: ShieldCheck, title: "Décisions plus sûres", text: "Comprendre avant de choisir." },
              { icon: Sparkles, title: "Direction personnalisée", text: "Pas un parcours générique." },
              { icon: GraduationCap, title: "Formations actionnables", text: "Des partenaires reliés au projet." },
              { icon: Handshake, title: "Accompagnement humain", text: "Une plateforme qui ne vous laisse pas seul." },
            ].map((item) => (
              <div key={item.title} className="p-5">
                <item.icon className="w-8 h-8 text-accent mx-auto mb-3" />
                <h3 className="font-display font-semibold text-lg text-primary-foreground mb-2">{item.title}</h3>
                <p className="text-primary-foreground/70 text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto bg-gradient-section border border-primary/15 rounded-3xl p-8 md:p-14 text-center shadow-soft">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Votre prochaine étape commence ici</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Rebondir, mais dans la bonne direction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketplace"><Button size="lg">Trouver une formation <ArrowRight className="w-5 h-5" /></Button></Link>
            <Link href="/bilan-de-competences"><Button size="lg" className="btn-cta">Faire un bilan de compétences <ArrowRight className="w-5 h-5" /></Button></Link>
          </div>
          <p className="mt-7 text-sm text-muted-foreground">
            Centre de formation ? <Link href="/centres" className="font-semibold text-primary hover:underline">Rejoindre le réseau Le Bon Rebond</Link>
          </p>
        </div>
      </section>
    </>
  );
}
