"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
  "Des centaines d'offres sur internet, impossibles à départager.",
  "La difficulté de savoir laquelle est réellement reconnue.",
  "La peur de perdre du temps — et de l'argent.",
  "Le manque d'accompagnement pour faire le bon choix.",
];

const CHECK_ITEMS = [
  { mk: "i.", title: "Analyse de votre projet", sub: "On part de votre objectif réel, de votre niveau et de vos contraintes." },
  { mk: "ii.", title: "Orientation vers les bons centres", sub: "Une sélection de partenaires sérieux, et non un annuaire interminable." },
  { mk: "iii.", title: "Des formations adaptées à votre niveau", sub: "Débutant ou expérimenté, on cible ce qui correspond vraiment." },
  { mk: "iv.", title: "Un passage rapide à l'action", sub: "Vous démarrez sans perdre des semaines en recherches." },
];

const STEPS = [
  { num: "01", title: "Vous décrivez votre projet", desc: "Votre objectif professionnel et le secteur que vous visez." },
  { num: "02", title: "On identifie les formations", desc: "Celles qui correspondent réellement à votre situation." },
  { num: "03", title: "On vous met en relation", desc: "Avec les centres partenaires adaptés à votre projet." },
  { num: "04", title: "Vous démarrez", desc: "Vous lancez votre formation, sereinement et au bon endroit." },
];

export default function FormationPage() {
  return (
    <>
      {/* ─── SUBHERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 84px" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(95,177,78,.16),transparent 70%)", top: -60, right: -50, pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 60, alignItems: "center" }} className="fo-subhero-grid">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
                {" · "}
                <b style={{ color: "#23756e" }}>Formations</b>
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: 0 }}>
                Trouvez la formation qui vous ouvre les{" "}
                <em style={{ fontStyle: "italic", color: "#2C8E86" }}>bonnes portes.</em>
              </h1>
              <p style={{ marginTop: 22, fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Le Bon Rebond vous met en relation avec des centres de formation fiables, choisis selon votre projet professionnel — pas selon un catalogue générique.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
                <Link href="/marketplace" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Trouver ma formation <span>→</span>
                </Link>
                <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                  J&apos;hésite encore
                </Link>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}>
                {["Centres sélectionnés", "Adapté à votre niveau", "Passage rapide à l'action"].map((t) => (
                  <span key={t} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />{t}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} style={{ position: "relative" }}>
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #5FB14E, #2C8E86 40%, transparent 60%)", opacity: .15, filter: "blur(2px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 480, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
                <ImgSlot id="fo-hero" alt="Photo — une personne en formation, concentrée et motivée" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── PROBLÈME ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="fo-problem-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Le constat</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
                Trop de formations, pas assez de clarté.
              </h2>
              <p style={{ fontSize: "1.15rem", color: "#5d6f7c", lineHeight: 1.65, marginTop: 14 }}>
                Le problème n&apos;est pas le manque d&apos;offres. C&apos;est l&apos;impossibilité de savoir{" "}
                <span style={{ color: "#2C8E86", fontWeight: 700 }}>laquelle est faite pour vous.</span>
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
            <span className="eyebrow">Notre solution</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Une mise en relation simple et efficace.
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

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Comment ça marche</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Quatre étapes, et vous démarrez.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} className="fo-steps-grid">
            {STEPS.map((s, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
                style={{ background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 20, padding: "30px 26px" }}>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.7rem", fontStyle: "italic", color: "#2C8E86", marginBottom: 14 }}>{s.num}</div>
                <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.2rem", fontWeight: 500, color: "#15314C", margin: "0 0 8px", lineHeight: 1.25 }}>{s.title}</h4>
                <p style={{ fontSize: ".96rem", color: "#5d6f7c", lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BAND NAVY ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              La bonne direction
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "26ch", margin: "0 auto" }}>
              La formation qui correspond à votre avenir, pas n&apos;importe laquelle.
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
              Passez du flou à <em style={{ fontStyle: "italic", color: "#2C8E86" }}>l&apos;action.</em>
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "52ch", margin: "0 auto 40px" }}>
              Décrivez-nous votre projet : on vous oriente vers la bonne formation et le bon centre, gratuitement.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              <Link href="/marketplace" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Je trouve ma formation <span>→</span>
              </Link>
              <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
                Je veux d&apos;abord un bilan
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .fo-subhero-grid { grid-template-columns: 1fr !important; }
          .fo-problem-grid { grid-template-columns: 1fr !important; }
          .fo-steps-grid   { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .fo-steps-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
