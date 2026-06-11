"use client";

import { useState } from "react";
import { Button } from "@/components/site/ui/button";
import { Badge } from "@/components/site/ui/badge";
import { Card, CardContent } from "@/components/site/ui/card";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { submitContactRequest } from "./actions";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }
  }),
};

const fieldClass =
  "w-full rounded-xl border border-input bg-card px-4 h-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors";

export default function Contact() {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", situation: "", message: "", cpfCheck: false });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Éligibilité CPF (verdict instantané, côté client)
  const [elig, setElig] = useState({ statut: "", experience: "", objectif: "" });
  const [eligResult, setEligResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await submitContactRequest(formData);
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? "Une erreur est survenue. Réessayez."); return; }
    setSent(true);
    setFormData({ name: "", email: "", phone: "", situation: "", message: "", cpfCheck: false });
  };

  const checkEligibility = () => {
    if (!elig.statut) { setEligResult("Sélectionnez au moins votre statut pour estimer votre éligibilité."); return; }
    if (elig.statut === "demandeur") {
      setEligResult("En tant que demandeur d'emploi, votre bilan peut être financé via votre CPF et, selon votre situation, complété par France Travail (AIF). Confirmons ensemble lors d'un premier rendez-vous gratuit.");
    } else {
      setEligResult("Bonne nouvelle : avec votre statut, votre bilan de compétences est en principe finançable par votre CPF, sans avance de frais ni information de votre employeur. Vérifions le montant exact ensemble lors d'un rendez-vous gratuit.");
    }
  };

  return (
    <>
      <section className="bg-gradient-hero py-16 lg:py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 rounded-full">Contact</Badge>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">Prenons <span className="font-script text-accent">rendez-vous</span></h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
              Votre premier rendez-vous est gratuit et sans engagement. Parlons de votre projet.
            </p>
            <Button size="lg" className="btn-cta h-14 text-lg hover:scale-[1.02] transition-all duration-300 flex flex-col items-center mx-auto">
              <span className="flex items-center gap-2"><Phone className="w-5 h-5" />Prendre RDV gratuit 45 min</span>
              <span className="text-xs opacity-80 font-normal">En Guadeloupe ou en visio · Sans engagement</span>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Eligibilité CPF */}
      <section id="eligibilite" className="container mx-auto px-4 py-12">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
          <Card className="max-w-3xl mx-auto border-accent/30 shadow-gold">
            <CardContent className="p-8">
              <h2 className="font-display text-2xl font-bold mb-2 text-center">Vérifiez votre éligibilité CPF</h2>
              <p className="text-muted-foreground text-center text-sm mb-6">Répondez à 3 questions pour savoir si vous pouvez financer votre bilan.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Votre statut</label>
                  <select className={fieldClass} value={elig.statut} onChange={(e) => setElig({ ...elig, statut: e.target.value })}>
                    <option value="" disabled>Choisir...</option>
                    <option value="salarie">Salarié(e)</option>
                    <option value="demandeur">Demandeur d'emploi</option>
                    <option value="independant">Indépendant(e)</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Années d'expérience</label>
                  <select className={fieldClass} value={elig.experience} onChange={(e) => setElig({ ...elig, experience: e.target.value })}>
                    <option value="" disabled>Choisir...</option>
                    <option value="0-2">0 à 2 ans</option>
                    <option value="3-5">3 à 5 ans</option>
                    <option value="5-10">5 à 10 ans</option>
                    <option value="10+">Plus de 10 ans</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Votre objectif</label>
                  <select className={fieldClass} value={elig.objectif} onChange={(e) => setElig({ ...elig, objectif: e.target.value })}>
                    <option value="" disabled>Choisir...</option>
                    <option value="reconversion">Reconversion</option>
                    <option value="evolution">Évolution</option>
                    <option value="validation">Valider un projet</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>
              <Button type="button" onClick={checkEligibility} className="w-full mt-6 bg-primary text-primary-foreground shadow-turquoise" size="lg">
                <CheckCircle2 className="mr-2 w-5 h-5" /> Vérifier mon éligibilité
              </Button>
              {eligResult && (
                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                  {eligResult}
                  <div className="mt-3">
                    <a href="#contact-form" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Réserver mon rendez-vous gratuit <Send className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Form */}
          <motion.div id="contact-form" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold mb-6">Envoyez-nous un message</h2>
            {sent ? (
              <Card className="border-primary/30 shadow-soft">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">Message envoyé !</h3>
                  <p className="text-muted-foreground text-sm">Nous vous recontactons sous 24h.</p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input className={fieldClass} placeholder="Votre nom complet" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                <input className={fieldClass} type="email" placeholder="Votre email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                <input className={fieldClass} type="tel" placeholder="Votre téléphone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                <select className={fieldClass} value={formData.situation} onChange={(e) => setFormData({ ...formData, situation: e.target.value })}>
                  <option value="" disabled>Votre situation actuelle</option>
                  <option value="salarie">Salarié(e)</option>
                  <option value="demandeur">Demandeur d'emploi</option>
                  <option value="entrepreneur">Entrepreneur / Porteur de projet</option>
                  <option value="autre">Autre</option>
                </select>
                <textarea
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-colors"
                  placeholder="Votre message (facultatif)"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={formData.cpfCheck} onChange={(e) => setFormData({ ...formData, cpfCheck: e.target.checked })} className="rounded border-input" />
                  Je souhaite vérifier mon éligibilité CPF
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" size="lg" className="w-full btn-cta" disabled={submitting}>
                  <Send className="mr-2 w-5 h-5" /> {submitting ? "Envoi…" : "Envoyer ma demande"}
                </Button>
              </form>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
            <h2 className="font-display text-2xl font-bold mb-6">Informations pratiques</h2>
            <div className="space-y-6">
              {[
                { icon: MapPin, title: "Adresse", lines: ["Pointe-à-Pitre", "Guadeloupe (971)"] },
                { icon: Phone, title: "Téléphone", lines: ["06 90 XX XX XX"] },
                { icon: Mail, title: "Email", lines: ["contact@lebonrebond.fr"] },
                { icon: Clock, title: "Horaires", lines: ["Lundi – Vendredi : 8h – 18h", "Samedi : sur rendez-vous"] },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    {item.lines.map((line, j) => (
                      <p key={j} className="text-muted-foreground text-sm">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
