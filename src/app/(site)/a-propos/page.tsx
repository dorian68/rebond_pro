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

const MISSION_VALUES = [
  { vn: "i.", title: "Simplifier l'accès à la formation", desc: "Rendre lisible un univers complexe et souvent décourageant." },
  { vn: "ii.", title: "Aider à mieux se connaître", desc: "Partir de la personne, de ses forces et de ses envies réelles." },
  { vn: "iii.", title: "Accélérer les reconversions réussies", desc: "Passer du questionnement à l'action, sans perdre des mois." },
  { vn: "iv.", title: "Connecter les bons acteurs", desc: "Relier particuliers et centres de formation de confiance." },
];

export default function AProposPage() {
  return (
    <>
      {/* ─── SUBHERO centré ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 48px", textAlign: "center" }}>
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(44,142,134,.14),transparent 70%)", top: -120, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
              <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
              {" · "}
              <b style={{ color: "#23756e" }}>À propos</b>
            </div>
            <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: "0 0 22px" }}>
              Redonner du sens aux{" "}
              <em style={{ fontStyle: "italic", color: "#2C8E86" }}>parcours professionnels.</em>
            </h1>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "62ch", margin: "0 auto" }}>
              Le Bon Rebond est né d&apos;une conviction simple : personne ne devrait rester bloqué dans le doute par manque d&apos;information ou d&apos;accompagnement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── PHOTO large ─── */}
      <section className="container" style={{ paddingBottom: 20 }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ height: 440, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
          <ImgSlot id="ap-team" alt="Photo — l'équipe, ou une scène d'accompagnement humaine et chaleureuse" />
        </motion.div>
      </section>

      {/* ─── HISTOIRE ─── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 60, alignItems: "start" }} className="ap-prose-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Notre histoire</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
                Un constat, devenu une mission.
              </h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: "1.1rem", color: "#5d6f7c", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                Le Bon Rebond est né d&apos;un constat simple : <strong style={{ color: "#15314C", fontWeight: 600 }}>trop de personnes veulent changer de vie professionnelle, mais ne savent pas par où commencer.</strong>
              </p>
              <p style={{ margin: 0 }}>
                Entre la surcharge d&apos;informations et le manque d&apos;accompagnement, beaucoup finissent par abandonner — ou par faire des choix qu&apos;elles regrettent.
              </p>
              <p style={{ margin: 0 }}>
                Nous avons créé Le Bon Rebond pour remettre de la clarté et du concret dans ces parcours. Pas un test de plus, mais une méthode de décision, et de vraies personnes pour accompagner chaque étape.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── MISSION ─── */}
      <section style={{ background: "#F3E9D7", padding: "100px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Notre mission</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Transformer les périodes de doute en décisions concrètes.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="ap-value-grid">
            {MISSION_VALUES.map((v, i) => (
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

      {/* ─── VISION (band) ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Notre vision
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "26ch", margin: "0 auto" }}>
              Un monde où chacun peut rebondir, sans être bloqué par le manque d&apos;information.
            </h2>
          </motion.div>
        </div>
      </section>

      {/* ─── POSITIONNEMENT ─── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 60, alignItems: "start" }} className="ap-prose-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Notre conviction</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
                Pas un test. Une décision.
              </h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: "1.1rem", color: "#5d6f7c", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                « Le Bon Rebond n&apos;est pas un test de personnalité. <strong style={{ color: "#15314C", fontWeight: 600 }}>C&apos;est une méthode de décision professionnelle.</strong> »
              </p>
              <p style={{ margin: 0 }}>
                Les personnes que nous accompagnons ne manquent pas de solutions : elles manquent d&apos;une direction fiable. Notre rôle n&apos;est pas d&apos;ajouter de l&apos;information, mais d&apos;aider à choisir — avec clarté, et en confiance.
              </p>
              <p style={{ margin: 0 }}>
                C&apos;est tout le sens de notre signature : <strong style={{ color: "#15314C", fontWeight: 600 }}>un nouveau départ, la bonne direction.</strong>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#FAF5EC", padding: "108px 0 120px", textAlign: "center" }}>
        <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", border: "1.5px solid rgba(44,142,134,.18)", left: -160, bottom: -320, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.22)", right: -120, top: -220, pointerEvents: "none" }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.03em", margin: "0 0 20px" }}>
              Et si votre <em style={{ fontStyle: "italic", color: "#2C8E86" }}>prochaine étape</em> commençait ici ?
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "52ch", margin: "0 auto 40px" }}>
              Que vous cherchiez une formation ou que vous ayez besoin d&apos;y voir plus clair, nous sommes là pour vous accompagner.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              <Link href="/formation" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Trouver une formation <span>→</span>
              </Link>
              <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
                Faire un bilan
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .ap-prose-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .ap-value-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
