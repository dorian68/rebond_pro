"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BILAN_COMPETENCES_PRICING } from "@/lib/pricing";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

function ImgSlot({ id, alt }: { id: string; alt: string }) {
  return (
    <div data-slot={id} aria-label={alt} style={{ width: "100%", height: "100%", background: "#e7ddca", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: ".82rem", color: "rgba(21,49,76,.45)", fontWeight: 600, padding: "0 20px", textAlign: "center" }}>{alt}</span>
    </div>
  );
}

const PAIN_ITEMS = [
  "Vous ne vous sentez plus à votre place dans votre travail.",
  "Vous avez envie de changer, mais sans savoir vers quoi.",
  "Vous avez peur de faire le mauvais choix.",
  "Vous tournez en rond depuis des mois.",
];

const CHECK_ITEMS = [
  { mk: "i.", title: "Faire le point sur votre parcours", sub: "Comprendre d'où vous venez pour décider où aller." },
  { mk: "ii.", title: "Identifier vos compétences réelles", sub: "Mettre des mots sur ce que vous savez faire — et aimez faire." },
  { mk: "iii.", title: "Explorer des pistes concrètes", sub: "Des métiers et des reconversions possibles, réalistes pour vous." },
  { mk: "iv.", title: "Construire un plan d'action clair", sub: "Repartir avec une trajectoire et des étapes précises." },
];

const METHOD_STEPS = [
  { n: "1", title: "Clarifier", desc: "Comprendre la situation, le blocage et ce que vous vivez." },
  { n: "2", title: "Identifier", desc: "Compétences, forces, valeurs et contraintes." },
  { n: "3", title: "Explorer", desc: "Métiers possibles et formations adaptées." },
  { n: "4", title: "Décider", desc: "Choisir une direction claire et réaliste." },
  { n: "5", title: "Plan d'action", desc: "Une feuille de route concrète sur 3 à 6 mois." },
];

const SPEC_FORMAT = [
  "5 à 8 semaines d'accompagnement",
  "6 à 10 séances, en visio ou en présentiel",
  "Des outils d'analyse et des exercices guidés",
  "Un consultant dédié, à votre écoute",
];

const SPEC_OBTIENT = [
  "Une analyse personnelle : parcours, blocages, motivations",
  "Une exploration métier avec des pistes concrètes",
  "Une orientation formation et la mise en relation Le Bon Rebond",
  "Un plan de carrière clair et une trajectoire recommandée",
];

const VALUES = [
  { vn: "i.", title: "De la clarté", desc: "Une vision nette de votre avenir professionnel, enfin." },
  { vn: "ii.", title: "Moins de stress", desc: "L'incertitude laisse place à une direction assumée." },
  { vn: "iii.", title: "Un projet réaliste", desc: "Atteignable, aligné avec qui vous êtes vraiment." },
  { vn: "iv.", title: "Une feuille de route", desc: "Des étapes concrètes pour passer à l'action." },
];

export default function BilanCompetencesPage() {
  return (
    <>
      {/* ─── SUBHERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 84px" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(44,142,134,.18),transparent 70%)", top: -60, right: -50, pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 60, alignItems: "center" }} className="bc-subhero-grid">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
                {" · "}
                <b style={{ color: "#23756e" }}>Bilan de compétences</b>
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: 0 }}>
                Faites le point sur votre carrière et retrouvez une{" "}
                <em style={{ fontStyle: "italic", color: "#2C8E86" }}>direction claire.</em>
              </h1>
              <p style={{ marginTop: 22, fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Le bilan Le Bon Rebond vous aide à comprendre vos forces, vos envies et à construire un projet professionnel réaliste et motivant — en quelques semaines.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
                <Link href="#offre" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Commencer mon bilan <span>→</span>
                </Link>
                <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                  Être rappelé
                </Link>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}>
                {["Accompagnement humain", "Méthode structurée", "Un plan d'action concret"].map((t) => (
                  <span key={t} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />{t}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} style={{ position: "relative" }}>
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #2C8E86, #5FB14E 40%, transparent 60%)", opacity: .16, filter: "blur(2px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 480, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
                <Image src="/photos/bilan-session.jpg" alt="Séance de bilan de compétences entre conseiller et bénéficiaire" fill style={{ objectFit: "cover", objectPosition: "center" }} priority sizes="(max-width:980px) 100vw, 48vw" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PROBLÈME ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="bc-problem-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Là où vous en êtes</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
                Vous êtes à un moment de doute professionnel ?
              </h2>
              <p style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, marginTop: 14 }}>
                Vous n&apos;êtes pas seul. Et surtout&nbsp;: il existe{" "}
                <span style={{ color: "#2C8E86", fontWeight: 700 }}>une méthode pour avancer.</span>
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
            <span className="eyebrow">La solution</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Un accompagnement structuré pour retrouver de la clarté.
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

      {/* ─── MÉTHODE REBOND CLARTÉ ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }} id="methode">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 60, alignItems: "start", marginBottom: 60 }} className="bc-method-head-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span style={{ display: "inline-block", background: "rgba(44,142,134,.12)", color: "#23756e", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".14em", textTransform: "uppercase" as const, padding: "6px 14px", borderRadius: 100, marginBottom: 18 }}>
                Notre méthode propriétaire
              </span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", margin: 0 }}>
                La méthode <em style={{ fontStyle: "italic", color: "#2C8E86" }}>Rebond Clarté</em>
              </h2>
            </motion.div>
            <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} custom={1} variants={fadeUp}
              style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, margin: 0, paddingTop: 8 }}>
              Le Bon Rebond n&apos;est pas un test de personnalité. C&apos;est une méthode de décision professionnelle, en cinq étapes, sur 5 à 8 semaines d&apos;accompagnement.
            </motion.p>
          </div>
          <div style={{ position: "relative" }}>
            <div className="bc-method-line" style={{ position: "absolute", top: 20, left: "calc(10% + 20px)", right: "calc(10% + 20px)", height: 2, background: "rgba(44,142,134,.25)", zIndex: 0 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, position: "relative", zIndex: 1 }} className="bc-method-row">
              {METHOD_STEPS.map((s, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#2C8E86", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1.05rem", fontFamily: "'Plus Jakarta Sans', sans-serif", flexShrink: 0, boxShadow: "0 4px 14px -4px rgba(44,142,134,.55)" }}>
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

      {/* ─── CE QUI EST INCLUS ─── */}
      <section style={{ padding: "100px 0", background: "#fff" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Ce qui est inclus</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Un accompagnement complet, du premier doute au plan d&apos;action.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="bc-spec-grid">
            {[
              { title: "Le format", items: SPEC_FORMAT, warm: true },
              { title: "Ce que vous obtenez", items: SPEC_OBTIENT, warm: false },
            ].map((col, ci) => (
              <motion.div key={ci} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={ci} variants={fadeUp}
                style={{ background: col.warm ? "#FDF8F1" : "#fff", border: "1.5px solid rgba(21,49,76,.1)", borderRadius: 24, padding: "36px" }}>
                <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.4rem", fontWeight: 500, color: "#15314C", margin: "0 0 22px" }}>{col.title}</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
                  {col.items.map((item) => (
                    <li key={item} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: ".98rem", color: "#3d4e5a", lineHeight: 1.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#5FB14E", flexShrink: 0, marginTop: 7 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BÉNÉFICES ─── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 620, marginBottom: 56 }}>
            <span className="eyebrow">Concrètement</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Ce que vous gagnez, au-delà des séances.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="bc-value-grid">
            {VALUES.map((v, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                style={{ display: "flex", gap: 22, alignItems: "flex-start", background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 20, padding: "30px 28px" }}>
                <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.6rem", fontStyle: "italic", color: "rgba(21,49,76,.22)", minWidth: 34, lineHeight: 1 }}>{v.vn}</span>
                <div>
                  <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.2rem", fontWeight: 500, color: "#15314C", margin: "0 0 8px" }}>{v.title}</h4>
                  <p style={{ fontSize: ".96rem", color: "#5d6f7c", lineHeight: 1.55, margin: 0 }}>{v.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TARIFS ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }} id="offre">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 60px" }}>
            <span className="eyebrow" style={{ justifyContent: "center" }}>Nos formules</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Choisissez l&apos;accompagnement qui vous ressemble.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, alignItems: "start" }} className="bc-price-grid">
            {BILAN_COMPETENCES_PRICING.map((plan, i) => (
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
                  <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#E07C39", color: "#fff", fontWeight: 700, fontSize: ".78rem", letterSpacing: ".1em", textTransform: "uppercase" as const, padding: "6px 18px", borderRadius: 100, whiteSpace: "nowrap" as const }}>
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
                    background: plan.featured ? "#E07C39" : "transparent",
                    color: plan.featured ? "#fff" : "#15314C",
                    border: plan.featured ? "none" : "1.5px solid rgba(21,49,76,.22)",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  } as CSSProperties}
                >
                  {plan.featured ? "Commencer mon bilan" : "Choisir cette formule"}
                </Link>
              </motion.div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 36, fontSize: ".9rem", color: "#85939d", fontStyle: "italic" }}>
            Tarifs indicatifs, ajustés selon votre situation. Financement CPF envisageable selon les cas.
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
              Comprendre avant de choisir
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "26ch", margin: "0 auto" }}>
              Un bon choix professionnel commence par une bonne compréhension de soi.
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
              Ne restez pas dans le <em style={{ fontStyle: "italic", color: "#2C8E86" }}>flou.</em>
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "50ch", margin: "0 auto 40px" }}>
              Faites le point pour mieux rebondir. Réservez un premier échange, sans engagement.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              <Link href="#offre" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Commencer mon bilan <span>→</span>
              </Link>
              <Link href="/contact" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
                Parler à un conseiller
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .bc-subhero-grid      { grid-template-columns: 1fr !important; }
          .bc-problem-grid      { grid-template-columns: 1fr !important; }
          .bc-method-head-grid  { grid-template-columns: 1fr !important; }
          .bc-spec-grid         { grid-template-columns: 1fr !important; }
          .bc-value-grid        { grid-template-columns: 1fr !important; }
          .bc-price-grid        { grid-template-columns: 1fr !important; }
          .bc-method-row        { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 640px) {
          .bc-price-grid   { grid-template-columns: 1fr !important; }
          .bc-method-line  { display: none !important; }
        }
      `}</style>
    </>
  );
}
