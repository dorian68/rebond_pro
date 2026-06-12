"use client";

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

function ImgSlot({ id, alt }: { id: string; alt: string }) {
  return (
    <div data-slot={id} aria-label={alt} style={{ width: "100%", height: "100%", background: "#e7ddca", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: ".82rem", color: "rgba(21,49,76,.45)", fontWeight: 600, padding: "0 20px", textAlign: "center" }}>{alt}</span>
    </div>
  );
}

const FACTS = [
  { fv: "Visibilité", fl: "Votre catalogue exposé aux personnes en reconversion qui cherchent vraiment." },
  { fv: "Mise en relation", fl: "Des demandes pré-qualifiées arrivent directement dans votre espace." },
  { fv: "Un espace dédié", fl: "Un tableau de bord pour piloter formations, sessions et demandes." },
];

const VALUES = [
  { vn: "i.", title: "Des candidats qualifiés", desc: "Nous orientons vers vous des personnes dont le projet correspond à vos formations." },
  { vn: "ii.", title: "Moins de prospection", desc: "Les demandes arrivent à vous : vous gagnez du temps commercial." },
  { vn: "iii.", title: "Une image de confiance", desc: "Profitez de la marque Le Bon Rebond et d'un micro-site dédié à votre centre." },
  { vn: "iv.", title: "Un outil de pilotage", desc: "Un espace partenaire clair pour suivre vos formations, sessions et demandes." },
];

const STEPS = [
  { num: "01", title: "Vous créez votre espace", desc: "Inscription de votre centre et présentation de votre organisme." },
  { num: "02", title: "Vous publiez vos formations", desc: "Votre catalogue devient visible auprès des candidats en reconversion." },
  { num: "03", title: "Vous recevez des demandes", desc: "Des mises en relation qualifiées arrivent dans votre tableau de bord." },
  { num: "04", title: "Vous accompagnez", desc: "Vous échangez, inscrivez et formez de nouveaux apprenants." },
];

const CHECK_ITEMS = [
  { mk: "i.", title: "Vos formations & sessions", sub: "Publiez, mettez à jour et planifiez vos sessions en quelques clics." },
  { mk: "ii.", title: "Vos demandes de mise en relation", sub: "Suivez chaque candidat, de la demande à l'inscription." },
  { mk: "iii.", title: "Vos apprenants & formateurs", sub: "Gérez vos cohortes et votre équipe pédagogique au même endroit." },
  { mk: "iv.", title: "Votre micro-site public", sub: "Une vitrine à votre marque, propulsée par Le Bon Rebond." },
];

export default function CentresPage() {
  return (
    <>
      {/* ─── SUBHERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 84px" }}>
        <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle,rgba(44,142,134,.16),transparent 70%)", top: -60, right: -50, pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 60, alignItems: "center" }} className="pa-subhero-grid">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
                <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
                {" · "}
                <b style={{ color: "#23756e" }}>Centres de formation</b>
              </div>
              <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: 0 }}>
                Recevez des candidats{" "}
                <em style={{ fontStyle: "italic", color: "#2C8E86" }}>vraiment motivés.</em>
              </h1>
              <p style={{ marginTop: 22, fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Vous êtes un organisme de formation ? Rejoignez le réseau Le Bon Rebond, gagnez en visibilité et recevez des demandes de mise en relation qualifiées — sans prospection.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 32 }}>
                <Link href="/register#centre" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Créer mon espace partenaire <span>→</span>
                </Link>
                <Link href="/login#centre" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                  Connexion partenaire
                </Link>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}>
                {["Demandes qualifiées", "Sans engagement", "Compatible CPF & Qualiopi"].map((t) => (
                  <span key={t} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />{t}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} style={{ position: "relative" }}>
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #2C8E86, #5FB14E 40%, transparent 60%)", opacity: .16, filter: "blur(2px)", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 480, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
                <Image src="/photos/centre-building.jpg" alt="Centre de formation — bâtiment et accueil" fill style={{ objectFit: "cover", objectPosition: "center" }} priority sizes="(max-width:980px) 100vw, 48vw" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAITS ─── */}
      <section className="container" style={{ paddingBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="pa-facts">
          {FACTS.map((f, i) => (
            <motion.div key={f.fv} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.5} variants={fadeUp}
              style={{ background: "#fff", border: "1.5px solid rgba(21,49,76,.08)", borderRadius: 20, padding: "26px 28px" }}>
              <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", fontWeight: 500, color: "#15314C", marginBottom: 6 }}>{f.fv}</div>
              <div style={{ fontSize: ".95rem", color: "#5d6f7c", lineHeight: 1.55 }}>{f.fl}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── POURQUOI NOUS REJOINDRE ─── */}
      <section style={{ padding: "92px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Pourquoi nous rejoindre</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Concentrez-vous sur la formation. Nous amenons les candidats.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="pa-value-grid">
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

      {/* ─── COMMENT ÇA MARCHE ─── */}
      <section style={{ background: "#F3E9D7", padding: "92px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Comment ça marche</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Rejoindre le réseau en quatre étapes.
            </h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }} className="pa-steps-grid">
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

      {/* ─── VOTRE ESPACE PARTENAIRE ─── */}
      <section style={{ padding: "92px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 56 }}>
            <span className="eyebrow">Votre espace partenaire</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.025em", marginTop: 18 }}>
              Tout votre centre, dans un seul tableau de bord.
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

      {/* ─── BAND NAVY ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Le réseau Le Bon Rebond
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "26ch", margin: "0 auto" }}>
              Des organismes de confiance, au service des bons rebonds.
            </h2>
          </motion.div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#FAF5EC", padding: "108px 0 120px", textAlign: "center" }} id="rejoindre">
        <div style={{ position: "absolute", width: 680, height: 680, borderRadius: "50%", border: "1.5px solid rgba(44,142,134,.18)", left: -160, bottom: -320, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.22)", right: -120, top: -220, pointerEvents: "none" }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, color: "#15314C", letterSpacing: "-.03em", margin: "0 0 20px" }}>
              Prêt à <em style={{ fontStyle: "italic", color: "#2C8E86" }}>rejoindre le réseau</em> ?
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "54ch", margin: "0 auto 40px" }}>
              Créez votre espace partenaire en quelques minutes et commencez à recevoir des demandes qualifiées.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              <Link href="/register#centre" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Créer mon espace partenaire <span>→</span>
              </Link>
              <Link href="/login#centre" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", background: "#15314C", color: "#fff", textDecoration: "none", lineHeight: 1 }}>
                J&apos;ai déjà un espace
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .pa-subhero-grid { grid-template-columns: 1fr !important; }
          .pa-facts        { grid-template-columns: 1fr !important; }
          .pa-value-grid   { grid-template-columns: 1fr !important; }
          .pa-steps-grid   { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .pa-steps-grid   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
