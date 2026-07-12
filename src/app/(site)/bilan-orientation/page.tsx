"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const PAIN_ITEMS = [
  "« Je ne sais pas ce qui me plaît vraiment. »",
  "La pression de Parcoursup et des dates qui approchent.",
  "Trop de filières, trop peu de repères concrets.",
  "La peur de se tromper de voie dès le départ.",
];

const CHECK_ITEMS = [
  { mk: "i.", title: "Comprendre ses centres d'intérêt réels", sub: "Au-delà des matières, ce qui le ou la met en mouvement." },
  { mk: "ii.", title: "Révéler ses forces et son potentiel", sub: "Identifier des talents que les bulletins ne montrent pas." },
  { mk: "iii.", title: "Explorer filières et métiers", sub: "Des pistes concrètes, reliées au monde réel." },
  { mk: "iv.", title: "Décider avec confiance", sub: "Un choix d'orientation clair, expliqué et assumé." },
];

const METHOD_STEPS = [
  { n: "1", title: "Clarifier", desc: "Comprendre ses envies, ses doutes et son contexte." },
  { n: "2", title: "Identifier", desc: "Forces, intérêts, manière d'apprendre." },
  { n: "3", title: "Explorer", desc: "Filières, études et métiers possibles." },
  { n: "4", title: "Décider", desc: "Un choix d'orientation clair et réaliste." },
  { n: "5", title: "Plan d'action", desc: "Les étapes : vœux, dossiers, échéances." },
];

const BILAN_ORIENTATION_PRICING = [
  {
    id: "essentiel",
    tier: "Essentiel",
    amount: "80 – 120",
    desc: "Pour clarifier rapidement une question d'orientation.",
    features: [
      "Entretien ciblé avec le jeune",
      "Premiers repères sur ses centres d'intérêt",
      "Pistes d'études ou de métiers à explorer",
      "Synthèse courte pour décider la suite",
    ],
    featured: false,
  },
  {
    id: "standard",
    tier: "Standard",
    amount: "120 – 180",
    desc: "L'accompagnement équilibré pour choisir avec confiance.",
    features: [
      "Exploration des forces et motivations",
      "Analyse des filières adaptées au profil",
      "Échange avec les parents si nécessaire",
      "Plan d'action pour les prochaines démarches",
    ],
    featured: true,
    flag: "Le plus choisi",
  },
  {
    id: "premium",
    tier: "Premium",
    amount: "180 – 240",
    desc: "Pour un accompagnement renforcé avant un choix important.",
    features: [
      "Tout le contenu Standard",
      "Approfondissement des pistes prioritaires",
      "Préparation des choix Parcoursup ou dossiers",
      "Suivi complémentaire après la synthèse",
    ],
    featured: false,
  },
] as const;

const STAGE_FEATURES = [
  { title: "Cours particuliers en tête-à-tête", sub: "Un accompagnement individuel, au rythme de l'élève." },
  { title: "Initiation à l'intelligence artificielle", sub: "Découvrir et utiliser les outils qui comptent demain." },
  { title: "Marketing digital", sub: "Comprendre les codes du numérique et de la création." },
  { title: "De la 4ᵉ à la Terminale", sub: "Collège, lycée, université et classes préparatoires." },
];

type StagePack = { name: string; price: string; featured?: boolean; note?: string; lines: string[] };
const STAGE_PACKS: StagePack[] = [
  { name: "Pack Essentiel", price: "650 €", lines: ["15 h de cours particuliers"] },
  { name: "Pack Performance", price: "950 €", featured: true, note: "Le plus complet", lines: ["12 h de cours particuliers", "3 h d'IA & Marketing digital"] },
  { name: "Pack Excellence", price: "1 250 €", lines: ["15 h de cours particuliers", "5 h d'IA & Marketing digital"] },
];

export default function BilanOrientationPage() {
  return (
    <>
      {/* ─── SUBHERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 84px" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(95,177,78,.16),transparent 70%)", top: -60, right: -50, pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 60, alignItems: "center" }} className="bo-subhero-grid">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
                {" · "}
                <b style={{ color: "#23756e" }}>Bilan d&apos;orientation</b>
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: 0 }}>
                Aider les jeunes à choisir une orientation{" "}
                <em style={{ fontStyle: "italic", color: "#2C8E86" }}>qui leur ressemble.</em>
              </h1>
              <p style={{ marginTop: 22, fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Collégiens, lycéens, étudiants : un accompagnement bienveillant pour transformer les questions et la pression des choix en une direction claire et assumée.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
                <Link href="/contact" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Prendre rendez-vous <span>→</span>
                </Link>
                <Link href="#stage-intensif" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                  Voir le stage d&apos;été
                </Link>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}>
                {["Pour le secondaire & le supérieur", "Sans jugement", "Parents associés"].map((t) => (
                  <span key={t} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />{t}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} style={{ position: "relative" }}>
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #5FB14E, #2C8E86 40%, transparent 60%)", opacity: .15, filter: "blur(2px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 480, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
                <Image
                  src="/photos/bilan-orientation-student.jpg"
                  alt="Étudiant travaillant sur ordinateur dans une bibliothèque"
                  fill
                  priority
                  sizes="(max-width:980px) 100vw, 48vw"
                  style={{ objectFit: "cover", objectPosition: "50% 56%" }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PROBLÈME ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="bo-problem-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Ce que vivent les jeunes</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
                Choisir une orientation à 16 ou 20 ans, sous pression.
              </h2>
              <p style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, marginTop: 14 }}>
                Beaucoup choisissent par défaut, par peur ou par méconnaissance. Ils méritent{" "}
                <span style={{ color: "#2C8E86", fontWeight: 700 }}>une vraie boussole.</span>
              </p>
            </motion.div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {PAIN_ITEMS.map((t, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                  style={{ display: "flex", gap: 20, alignItems: "flex-start", background: "#fff", borderRadius: 16, padding: "24px 26px", boxShadow: "0 4px 20px -10px rgba(14,36,56,.12)" }}>
                  <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.15rem", fontWeight: 500, color: "rgba(21,49,76,.35)", minWidth: 28, paddingTop: 1 }}>0{i + 1}</span>
                  <span style={{ fontSize: "1.04rem", color: "#1b2b38", fontWeight: 600, lineHeight: 1.5 }}>{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOLUTION ─── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Notre accompagnement</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Une démarche qui part de la personne, pas des notes.
            </h2>
          </motion.div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
            {CHECK_ITEMS.map((item, i) => (
              <motion.li key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{ display: "flex", gap: 32, alignItems: "flex-start", padding: "28px 0", borderTop: "1px solid rgba(21,49,76,.1)" }}>
                <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", fontStyle: "italic", color: "rgba(21,49,76,.25)", minWidth: 40 }}>{item.mk}</span>
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#15314C" }}>{item.title}</div>
                  <div style={{ fontSize: ".98rem", color: "#5d6f7c", marginTop: 5, lineHeight: 1.55 }}>{item.sub}</div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── MÉTHODE ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }} id="methode">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 60, alignItems: "start", marginBottom: 60 }} className="bo-method-head-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span style={{ display: "inline-block", background: "rgba(44,142,134,.12)", color: "#23756e", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".14em", textTransform: "uppercase" as const, padding: "6px 14px", borderRadius: 100, marginBottom: 18 }}>
                Notre méthode propriétaire
              </span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", margin: 0 }}>
                La méthode <em style={{ fontStyle: "italic", color: "#2C8E86" }}>Rebond</em>
              </h2>
            </motion.div>
            <div>
              <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={1} variants={fadeUp}
                style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, margin: "0 0 24px", paddingTop: 8 }}>
                La même rigueur que pour les adultes, avec un ton adapté à l&apos;âge : on accompagne le jeune — et ses parents — du questionnement à une décision sereine.
              </motion.p>
              <motion.blockquote initial="hidden" whileInView="visible" viewport={{ once: true }} custom={2} variants={fadeUp}
                style={{ margin: 0, padding: "16px 24px", borderLeft: "3px solid #2C8E86", background: "rgba(44,142,134,.06)", borderRadius: "0 12px 12px 0" }}>
                <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.15rem", fontStyle: "italic", color: "#15314C", margin: 0 }}>
                  « Le bon moment pour <strong style={{ fontWeight: 600 }}>bien commencer.</strong> »
                </p>
              </motion.blockquote>
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <div className="bo-method-line" style={{ position: "absolute", top: 20, left: "calc(10% + 20px)", right: "calc(10% + 20px)", height: 2, background: "rgba(95,177,78,.3)", zIndex: 0 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, position: "relative", zIndex: 1 }} className="bo-method-row">
              {METHOD_STEPS.map((s, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#5FB14E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.05rem", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, boxShadow: "0 4px 14px -4px rgba(95,177,78,.55)" }}>
                    {s.n}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: ".98rem", color: "#15314C", marginBottom: 6 }}>{s.title}</div>
                    <div style={{ fontSize: ".9rem", color: "#5d6f7c", lineHeight: 1.55 }}>{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TARIFS BILAN D'ORIENTATION ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }} id="formules-orientation">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 60px" }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}>Nos formules</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Un format adapté à l&apos;âge, au niveau et au besoin du moment.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, alignItems: "start" }} className="bo-price-grid">
            {BILAN_ORIENTATION_PRICING.map((plan, i) => (
              <motion.div key={plan.id} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                style={{
                  position: "relative" as const,
                  background: plan.featured ? "#15314C" : "#fff",
                  border: plan.featured ? "none" : "1.5px solid rgba(21,49,76,.1)",
                  borderRadius: 24,
                  padding: plan.featured ? "36px 32px 32px" : "32px",
                  boxShadow: plan.featured ? "0 24px 60px -20px rgba(14,36,56,.55)" : "0 8px 30px -16px rgba(14,36,56,.15)",
                  transform: plan.featured ? "scale(1.025)" : "none",
                } as CSSProperties}>
                {"flag" in plan && plan.flag && (
                  <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#B85B22", color: "#fff", fontWeight: 700, fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" as const, padding: "6px 18px", borderRadius: 100, whiteSpace: "nowrap" as const }}>
                    {plan.flag}
                  </span>
                )}
                <div style={{ fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: plan.featured ? "#5FB14E" : "#23756e", marginBottom: 12 }}>{plan.tier}</div>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.2rem,3.5vw,2.8rem)", fontWeight: 400, color: plan.featured ? "#fff" : "#15314C", lineHeight: 1, marginBottom: 4 }}>
                  {plan.amount} <span style={{ fontSize: "1.2rem" }}>€</span>
                </div>
                <p style={{ fontSize: ".98rem", color: plan.featured ? "rgba(255,255,255,.72)" : "#5d6f7c", lineHeight: 1.55, marginBottom: 24 }}>{plan.desc}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 11 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: ".94rem", color: plan.featured ? "rgba(255,255,255,.88)" : "#3d4e5a", lineHeight: 1.45 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: plan.featured ? "#5FB14E" : "#2C8E86", flexShrink: 0, marginTop: 6 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "15px 24px",
                    borderRadius: 100,
                    fontWeight: 700,
                    fontSize: ".96rem",
                    textDecoration: "none",
                    background: plan.featured ? "#B85B22" : "transparent",
                    color: plan.featured ? "#fff" : "#15314C",
                    border: plan.featured ? "none" : "1.5px solid rgba(21,49,76,.22)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  } as CSSProperties}
                >
                  {plan.featured ? "Réserver ce bilan" : "Choisir cette formule"}
                </Link>
              </motion.div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 36, fontSize: ".9rem", color: "#5f6977", fontStyle: "italic" }}>
            Tarifs indicatifs, ajustés selon le niveau, la situation et le format d&apos;accompagnement retenu.
          </p>
        </div>
      </section>

      {/* ─── STAGE INTENSIF D'ÉTÉ ─── */}
      <section style={{ padding: "100px 0" }} id="stage-intensif">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 720, marginBottom: 48 }}>
            <span style={{ display: "inline-block", background: "rgba(44,142,134,.12)", color: "#23756e", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".14em", textTransform: "uppercase" as const, padding: "6px 14px", borderRadius: 100, marginBottom: 18 }}>
              Stage intensif · Juillet &amp; Août
            </span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", margin: 0 }}>
              Un été pour <em style={{ fontStyle: "italic", color: "#2C8E86" }}>préparer la rentrée</em>, encadré par des ingénieurs.
            </h2>
            <p style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, marginTop: 16 }}>
              Collégiens, lycéens et étudiants : reprenez de l&apos;avance avec des cours particuliers, une initiation à l&apos;IA et au marketing digital — de la 4ᵉ aux classes préparatoires.
            </p>
          </motion.div>

          {/* Atouts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 56 }} className="bo-stage-features">
            {STAGE_FEATURES.map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{ background: "#F3E9D7", borderRadius: 16, padding: "24px 22px" }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(44,142,134,.14)", color: "#2C8E86", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.2rem", marginBottom: 14 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#15314C", lineHeight: 1.35 }}>{f.title}</div>
                <div style={{ fontSize: ".9rem", color: "#5d6f7c", marginTop: 7, lineHeight: 1.55 }}>{f.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Formules */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "start" }} className="bo-stage-packs">
            {STAGE_PACKS.map((p, i) => (
              <motion.div key={p.name} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{
                  position: "relative",
                  background: "#fff",
                  border: p.featured ? "1.5px solid rgba(44,142,134,.55)" : "1px solid rgba(21,49,76,.1)",
                  borderRadius: 22,
                  overflow: "hidden",
                  boxShadow: p.featured ? "0 22px 50px -34px rgba(44,142,134,.42)" : "0 4px 20px -12px rgba(14,36,56,.1)",
                }}>
                {/* Filet supérieur — accent teal pour la formule mise en avant, neutre sinon */}
                <div style={{ height: 3, background: p.featured ? "#2C8E86" : "rgba(21,49,76,.12)" }} />
                <div style={{ padding: "34px 30px 32px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" as const, fontSize: ".78rem", color: p.featured ? "#23756e" : "#5d6f7c" }}>
                      {p.name}
                    </span>
                    {p.note && (
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, fontSize: ".66rem", color: "#23756e", background: "rgba(44,142,134,.1)", padding: "3px 9px", borderRadius: 100 }}>
                        {p.note}
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "3rem", fontWeight: 400, color: "#15314C", lineHeight: 1 }}>{p.price}</div>
                  <div style={{ height: 1, background: "rgba(21,49,76,.1)", margin: "24px 0" }} />
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                    {p.lines.map((l) => (
                      <li key={l} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span aria-hidden style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(95,177,78,.14)", color: "#4a9c3c", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: ".72rem", fontWeight: 800, flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span style={{ fontSize: "1rem", color: "#1b2b38", fontWeight: 600, lineHeight: 1.45 }}>{l}</span>
                      </li>
                    ))}
                  </ul>
                  {p.featured ? (
                    <Link href="/contact" className="btn-cta" style={{ display: "flex", justifyContent: "center", marginTop: 28, padding: "15px 24px", borderRadius: 100, fontWeight: 700, fontSize: "1rem", textDecoration: "none", lineHeight: 1 }}>
                      Réserver ce pack
                    </Link>
                  ) : (
                    <Link href="/contact" style={{ display: "flex", justifyContent: "center", marginTop: 28, padding: "15px 24px", borderRadius: 100, fontWeight: 700, fontSize: "1rem", textDecoration: "none", lineHeight: 1, background: "transparent", color: "#15314C", border: "1.5px solid rgba(21,49,76,.22)" }}>
                      Réserver ce pack
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <p style={{ fontSize: ".92rem", color: "#5d6f7c", marginTop: 26, textAlign: "center" }}>
            Places limitées · Sessions en juillet et août · Nous contacter pour composer un accompagnement sur mesure.
          </p>
        </div>
      </section>

      {/* ─── BAND NAVY ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Pour les élèves &amp; étudiants
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "26ch", margin: "0 auto" }}>
              Chaque parcours mérite de commencer dans la bonne direction.
            </h2>
          </motion.div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#FAF5EC", padding: "108px 0 120px", textAlign: "center" }}>
        <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", border: "1.5px solid rgba(44,142,134,.18)", left: -160, bottom: -320, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.22)", right: -120, top: -220, pointerEvents: "none" }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.03em", margin: "0 0 20px" }}>
              Donnez-lui une <em style={{ fontStyle: "italic", color: "#2C8E86" }}>vraie boussole.</em>
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "50ch", margin: "0 auto 40px" }}>
              Un premier échange pour comprendre la situation et voir comment nous pouvons l&apos;accompagner.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              <Link href="/contact" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Prendre rendez-vous <span>→</span>
              </Link>
              <Link href="/a-propos" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
                Qui sommes-nous ?
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .bo-subhero-grid      { grid-template-columns: 1fr !important; }
          .bo-problem-grid      { grid-template-columns: 1fr !important; }
          .bo-method-head-grid  { grid-template-columns: 1fr !important; }
          .bo-method-row        { grid-template-columns: 1fr 1fr !important; }
          .bo-price-grid        { grid-template-columns: 1fr !important; }
          .bo-stage-features    { grid-template-columns: 1fr 1fr !important; }
          .bo-stage-packs       { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bo-method-line     { display: none !important; }
          .bo-method-row      { grid-template-columns: 1fr !important; }
          .bo-stage-features  { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
