"use client";

import Link from "next/link";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, CalendarRange, Target, FileText,
  UserCheck, Sparkles, Globe, Building2, ShieldCheck, Layers,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

const features = [
  { icon: CalendarRange, title: "Planning fiable", desc: "Repérez les conflits, confirmez les formateurs et trouvez les meilleurs créneaux." },
  { icon: Target, title: "CRM formation", desc: "Transformez les demandes en inscriptions avec un pipeline relié à votre catalogue." },
  { icon: FileText, title: "Documents prêts", desc: "Générez programmes, convocations et attestations depuis des données cohérentes." },
  { icon: UserCheck, title: "Portail formateurs", desc: "Vos formateurs renseignent leurs disponibilités et consultent leur planning." },
  { icon: Sparkles, title: "Assistant intégré", desc: "Préparez relances et recommandations à partir des informations réelles du centre." },
  { icon: Globe, title: "Profil & catalogue", desc: "Publiez votre fiche centre et recevez chaque demande directement dans le CRM." },
];

export default function Centres() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-hero relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <Badge className="mb-6 bg-secondary/15 text-secondary border-secondary/30 px-4 py-1.5 text-sm font-medium rounded-full">
                <Building2 className="w-3.5 h-3.5 mr-1.5" /> Espace partenaires
              </Badge>
            </motion.div>
            <motion.h1
              initial="hidden" animate="visible" custom={1} variants={fadeUp}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
            >
              Rejoignez le réseau qui transforme les projets en <span className="font-script text-secondary">formations</span>
            </motion.h1>
            <motion.p
              initial="hidden" animate="visible" custom={2} variants={fadeUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Gagnez en visibilité auprès de personnes en transition professionnelle et pilotez vos formations,
              vos demandes, vos sessions et vos documents depuis un espace partenaire unique.
            </motion.p>
            <motion.div
              initial="hidden" animate="visible" custom={3} variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14 hover:scale-[1.02] transition-all duration-300">
                  Créer mon espace partenaire <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground text-base px-8">
                  Connexion
                </Button>
              </Link>
            </motion.div>
            <motion.p initial="hidden" animate="visible" custom={4} variants={fadeUp} className="text-sm text-muted-foreground mt-5">
              Essai de 14 jours, sans carte bancaire. Données de démonstration clairement identifiées.
            </motion.p>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-16 bg-background" style={{ clipPath: "polygon(0 60%, 100% 0%, 100% 100%, 0% 100%)" }} />
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Un cockpit centralisé</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Recevez des demandes qualifiées et gérez leur transformation en parcours réels.</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i % 3} variants={fadeUp}>
              <Card className="h-full shadow-soft hover:shadow-turquoise transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-gradient-section py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Des outils dispersés cachent les <span className="font-script text-accent">décisions</span></h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Le Bon Rebond Partenaires les remet au centre, sans chiffres décoratifs.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: ShieldCheck, title: "Moins d'oublis", desc: "Relances, confirmations formateurs et documents à préparer deviennent visibles." },
              { icon: Layers, title: "Coordination fluide", desc: "Formateurs, disponibilités, planning et catalogue racontent enfin la même histoire." },
              { icon: Target, title: "Un pilotage crédible", desc: "Les indicateurs viennent de vos données réelles, jamais de chiffres décoratifs." },
            ].map((b, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                <Card className="h-full text-center shadow-soft hover:shadow-turquoise transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center mx-auto mb-4">
                      <b.icon className="w-6 h-6 text-secondary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{b.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{b.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="container mx-auto px-4 py-20 lg:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">Comment ça marche ?</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Quatre étapes pour structurer votre centre.</p>
        </motion.div>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            "Je crée mon espace centre",
            "J'ajoute mes formations et mon catalogue",
            "J'invite mes formateurs",
            "Je collecte les disponibilités et consulte les plannings",
          ].map((step, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
              <Card className="shadow-soft">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 font-display font-bold shadow-turquoise">
                    {i + 1}
                  </div>
                  <span className="text-foreground font-medium">{step}</span>
                  <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 pb-20 lg:pb-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          className="bg-primary rounded-3xl p-8 md:p-14 text-center text-primary-foreground max-w-3xl mx-auto shadow-turquoise"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Prêt à rejoindre Le Bon Rebond ?
          </h2>
          <p className="opacity-70 text-lg mb-8 max-w-xl mx-auto">
            Créez votre espace en quelques minutes, ou explorez d'abord le catalogue public du réseau.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto btn-cta text-lg px-8 h-14 hover:scale-[1.02] transition-all duration-300">
                Créer mon espace partenaire <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                Explorer le catalogue
              </Button>
            </Link>
          </div>
          <p className="opacity-60 text-sm mt-6">
            Vous êtes un particulier ? <Link href="/" className="underline underline-offset-4">Trouver votre prochaine direction</Link>
          </p>
        </motion.div>
      </section>
    </>
  );
}
