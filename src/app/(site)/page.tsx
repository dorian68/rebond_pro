"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const pains = [
  "Trop d'offres de formation, impossibles à comparer sereinement.",
  "La peur de choisir une voie qui ne vous correspond pas.",
  "Le sentiment de tourner en rond, sans prochaine étape claire.",
  "Le manque d'accompagnement pour passer réellement à l'action.",
];

const steps = [
  { n: "01", title: "Vous décrivez votre situation", text: "Votre objectif, vos hésitations et le changement que vous envisagez." },
  { n: "02", title: "Nous clarifions votre besoin", text: "Formation ciblée ou accompagnement pour construire votre projet." },
  { n: "03", title: "Vous êtes mis en relation", text: "Avec les bons centres de formation ou un consultant bilan de compétences." },
  { n: "04", title: "Vous avancez concrètement", text: "Avec une direction claire et un plan d'action réellement actionnable." },
];

const methodSteps = [
  { n: "1", title: "Clarifier", text: "Comprendre la situation, le blocage et ce que vous vivez vraiment." },
  { n: "2", title: "Identifier", text: "Mettre à plat vos compétences, vos forces, vos valeurs et vos contraintes." },
  { n: "3", title: "Explorer", text: "Découvrir des métiers possibles et les formations qui y mènent." },
  { n: "4", title: "Décider", text: "Choisir une direction claire, réaliste et qui vous ressemble." },
  { n: "5", title: "Plan d'action", text: "Repartir avec une feuille de route concrète sur 3 à 6 mois." },
];

const values = [
  { n: "i.", title: "Du temps gagné", text: "Fini les heures perdues à comparer des dizaines d'organismes : nous filtrons pour vous les solutions sérieuses." },
  { n: "ii.", title: "Une orientation claire", text: "Un accompagnement personnalisé qui part de votre situation réelle, pas d'un catalogue générique." },
  { n: "iii.", title: "Des partenaires fiables", text: "Un accès à des centres de formation sélectionnés et adaptés à votre niveau et votre projet." },
  { n: "iv.", title: "Un accompagnement humain", text: "Pas seulement une plateforme : de vraies personnes pour vous guider du doute à la décision." },
];


/* Lien texte avec flèche */
function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ fontWeight: 700, color: "#23756e", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: "1rem" }}>
      {children}
      <span style={{ transition: "transform .2s", display: "inline-block" }}>→</span>
    </Link>
  );
}

export default function Home() {
  return (
    <>
      {/* ======================== HERO ======================== */}
      <section style={{ position: "relative", overflow: "hidden", padding: "84px 0 96px" }}>
        {/* blob décor */}
        <div style={{ position: "absolute", width: 340, height: 340, borderRadius: "50%", background: "radial-gradient(circle,rgba(95,177,78,.16),transparent 70%)", top: -80, right: -60, pointerEvents: "none", zIndex: 0 }} />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 64, alignItems: "center" }} className="hero-grid">

            {/* Copie gauche */}
            <div>
              <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
                <span className="eyebrow">Orientation · Formation · Reconversion</span>
              </motion.div>

              <motion.h1
                initial="hidden" animate="visible" custom={1} variants={fadeUp}
                style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.7rem, 5.4vw, 4.5rem)", fontWeight: 400, letterSpacing: "-.03em", margin: "22px 0 0", color: "#15314C", lineHeight: 1.08 }}
              >
                Trouvez votre prochaine{" "}
                <em style={{ fontStyle: "italic", color: "#2C8E86" }}>direction</em>{" "}
                professionnelle, simplement.
              </motion.h1>

              <motion.p
                initial="hidden" animate="visible" custom={2} variants={fadeUp}
                style={{ marginTop: 26, fontSize: "1.22rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "62ch" }}
              >
                Le Bon Rebond accompagne les personnes en transition pour transformer une période de doute en projet clair, puis en parcours de formation ou de reconversion concret.
              </motion.p>

              <motion.div
                initial="hidden" animate="visible" custom={3} variants={fadeUp}
                style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 38 }}
              >
                <Link href="/marketplace" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                  Je cherche une formation <span style={{ display: "inline-block", transition: "transform .2s" }}>→</span>
                </Link>
                <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(21,49,76,.22)", color: "#15314C", textDecoration: "none", transition: "border-color .2s, background .2s", lineHeight: 1, background: "transparent" }}>
                  Je veux faire un bilan
                </Link>
              </motion.div>

              <motion.div
                initial="hidden" animate="visible" custom={4} variants={fadeUp}
                style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", marginTop: 34 }}
              >
                {["Accès rapide aux organismes certifiés", "Accompagnement personnalisé", "100% orienté résultat"].map((txt) => (
                  <span key={txt} style={{ fontSize: ".92rem", color: "#5d6f7c", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FB14E", flexShrink: 0 }} />
                    {txt}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Visuel droit */}
            <motion.div
              initial="hidden" animate="visible" custom={2} variants={fadeUp}
              style={{ position: "relative" }}
            >
              {/* Arc décoratif */}
              <div style={{ position: "absolute", zIndex: 1, width: "115%", height: "115%", left: "-7%", top: "-7%", borderRadius: "50%", background: "conic-gradient(from 200deg, #2C8E86, #5FB14E 40%, transparent 60%)", opacity: .16, filter: "blur(2px)", pointerEvents: "none" }} />

              {/* Photo hero */}
              <div style={{ position: "relative", zIndex: 2, width: "100%", height: 540, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
                <Image src="/photos/hero-woman.jpg" alt="Professionnelle en reconversion regardant avec confiance" fill style={{ objectFit: "cover", objectPosition: "center 35%" }} priority sizes="(max-width:980px) 100vw, 50vw" />
              </div>

              {/* Badge flottant */}
              <div style={{ position: "absolute", zIndex: 3, left: -30, bottom: 46, background: "#fff", borderRadius: 20, padding: "20px 24px", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)", maxWidth: 264, border: "1px solid rgba(21,49,76,.12)" }}>
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "2.3rem", color: "#15314C", lineHeight: 1, fontWeight: 500 }}>Un cap, pas un catalogue.</div>
                <div style={{ fontSize: ".86rem", color: "#5d6f7c", marginTop: 7, lineHeight: 1.45 }}>On vous oriente vers la bonne formation — et vers les bons partenaires.</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ======================== DEUX PARCOURS ======================== */}
      <section style={{ background: "#fff", borderTop: "1px solid rgba(21,49,76,.12)", borderBottom: "1px solid rgba(21,49,76,.12)", padding: "108px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <span className="eyebrow">Par où commencer ?</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem, 3.6vw, 2.9rem)", fontWeight: 400, letterSpacing: "-.02em", margin: "18px 0 54px", color: "#15314C", maxWidth: 720 }}>
              Deux portes d'entrée, une seule promesse&nbsp;:{" "}
              <em style={{ fontStyle: "italic", color: "#2C8E86" }}>avancer.</em>
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }} className="path-cards-grid">
            {/* Carte Formation */}
            <motion.article
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0} variants={fadeUp}
              style={{ borderRadius: 26, overflow: "hidden", background: "#FAF5EC", border: "1px solid rgba(21,49,76,.12)", display: "flex", flexDirection: "column", transition: "transform .25s ease, box-shadow .25s ease" }}
              whileHover={{ y: -6, boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}
            >
              <div style={{ height: 248, position: "relative" }}>
                <div style={{ position: "absolute", top: 18, right: 18, zIndex: 3, background: "rgba(14,36,56,.78)", color: "#fff", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "8px 14px", borderRadius: 100, backdropFilter: "blur(4px)" }}>
                  Mise en relation
                </div>
                <Image src="/photos/formation-training.jpg" alt="Groupe en formation professionnelle" fill style={{ objectFit: "cover" }} sizes="(max-width:980px) 100vw, 50vw" />
              </div>
              <div style={{ padding: "34px 34px 38px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <span style={{ fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#23756e" }}>Je cherche une formation</span>
                <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.8rem", fontWeight: 500, margin: 0, color: "#15314C" }}>La bonne formation, pas n'importe laquelle</h3>
                <p style={{ color: "#5d6f7c", margin: 0, lineHeight: 1.65 }}>Explorez des formations sérieuses et adaptées à votre projet, puis laissez-nous vous mettre en relation avec le centre partenaire qui correspond vraiment.</p>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <TextLink href="/formation">Trouver ma formation</TextLink>
                </div>
              </div>
            </motion.article>

            {/* Carte Bilan */}
            <motion.article
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ borderRadius: 26, overflow: "hidden", background: "#FAF5EC", border: "1px solid rgba(21,49,76,.12)", display: "flex", flexDirection: "column", transition: "transform .25s ease, box-shadow .25s ease" }}
              whileHover={{ y: -6, boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}
            >
              <div style={{ height: 248, position: "relative" }}>
                <div style={{ position: "absolute", top: 18, right: 18, zIndex: 3, background: "rgba(14,36,56,.78)", color: "#fff", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "8px 14px", borderRadius: 100, backdropFilter: "blur(4px)" }}>
                  Produit premium
                </div>
                <Image src="/photos/bilan-consultation.jpg" alt="Entretien de bilan de compétences entre conseiller et bénéficiaire" fill style={{ objectFit: "cover" }} sizes="(max-width:980px) 100vw, 50vw" />
              </div>
              <div style={{ padding: "34px 34px 38px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <span style={{ fontSize: ".82rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#C5662A" }}>J'ai besoin d'y voir plus clair</span>
                <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.8rem", fontWeight: 500, margin: 0, color: "#15314C" }}>Comprendre avant de choisir</h3>
                <p style={{ color: "#5d6f7c", margin: 0, lineHeight: 1.65 }}>Le bilan de compétences Le Bon Rebond vous aide à faire le point, à choisir une direction réaliste et à repartir avec un vrai plan d'action.</p>
                <div style={{ marginTop: "auto", paddingTop: 8 }}>
                  <Link href="/bilan-de-competences" style={{ fontWeight: 700, color: "#C5662A", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: "1rem" }}>
                    Faire mon bilan <span>→</span>
                  </Link>
                </div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      {/* ======================== BANDEAU ÉMOTIONNEL ======================== */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        {/* Arcs décoratifs */}
        <div style={{ position: "absolute", zIndex: 1, width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", zIndex: 1, width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none" }} />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Du doute à la direction
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem, 4.6vw, 3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "18ch", margin: "0 auto" }}>
              Vous n'êtes pas perdu. Vous êtes simplement entre deux étapes.
            </h2>
          </motion.div>
        </div>
      </section>

      {/* ======================== PROBLÈME ======================== */}
      <section style={{ padding: "108px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 64, alignItems: "start" }} className="problem-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Le vrai problème</span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem, 3.6vw, 2.9rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "18px 0 0", color: "#15314C" }}>
                Vous savez que vous devez évoluer, mais pas toujours par où commencer.
              </h2>
              <p style={{ marginTop: 30, fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.35rem", fontStyle: "italic", color: "#15314C", lineHeight: 1.4 }}>
                Les personnes en transition ne manquent pas de solutions. Elles manquent d'une{" "}
                <span style={{ color: "#2C8E86" }}>direction fiable.</span>
              </p>
            </motion.div>

            <div style={{ borderTop: "1px solid rgba(21,49,76,.12)" }}>
              {pains.map((pain, i) => (
                <motion.div
                  key={pain}
                  initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                  style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 24, padding: "26px 0", borderBottom: "1px solid rgba(21,49,76,.12)", alignItems: "baseline" }}
                >
                  <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", color: "#2C8E86", fontStyle: "italic", lineHeight: 1 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "1.18rem", color: "#1b2b38", fontWeight: 500 }}>{pain}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================== FONCTIONNEMENT ======================== */}
      <section style={{ background: "#fff", borderTop: "1px solid rgba(21,49,76,.12)", padding: "108px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 60 }}>
            <span className="eyebrow">Comment ça fonctionne</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem, 3.6vw, 2.9rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "18px 0 0", color: "#15314C" }}>
              Un chemin simple pour passer du flou à l'action.
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 34 }} className="steps-grid">
            {steps.map((step, i) => (
              <motion.div
                key={step.n}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{ position: "relative", paddingTop: 26 }}
              >
                {/* Trait vert au-dessus */}
                <div style={{ position: "absolute", top: 0, left: 0, width: 46, height: 3, borderRadius: 3, background: "#5FB14E" }} />
                <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "3.2rem", fontWeight: 400, color: "#15314C", opacity: .9, lineHeight: 1 }}>
                  {step.n}
                </div>
                <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.32rem", fontWeight: 500, margin: "16px 0 10px", color: "#15314C" }}>{step.title}</h4>
                <p style={{ color: "#5d6f7c", fontSize: "1rem", lineHeight: 1.6 }}>{step.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== MÉTHODE REBOND CLARTÉ ======================== */}
      <section style={{ background: "#F3E9D7", position: "relative", overflow: "hidden", padding: "108px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "end", marginBottom: 62 }} className="method-head-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span style={{ display: "inline-block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".14em", textTransform: "uppercase", color: "#C5662A", background: "rgba(224,124,57,.12)", padding: "8px 16px", borderRadius: 100, marginBottom: 20 }}>
                Notre méthode
              </span>
              <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.1rem, 4vw, 3.1rem)", fontWeight: 500, letterSpacing: "-.02em", margin: 0, color: "#15314C" }}>
                La méthode <em style={{ fontStyle: "italic", color: "#2C8E86" }}>Rebond</em>
              </h2>
            </motion.div>
            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "62ch", margin: 0 }}
            >
              Le Bon Rebond n'est pas un test de personnalité. C'est une méthode de décision professionnelle, en cinq étapes, pour sortir du flou en quelques semaines.
            </motion.p>
          </div>

          {/* 5 étapes */}
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0 }} className="method-row">
            {/* Ligne horizontale connectante */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 34, height: 2, background: "linear-gradient(90deg,#2C8E86,#5FB14E)", opacity: .5, zIndex: 0 }} className="vitrine-desktop-only" />

            {methodSteps.map((ms, i) => (
              <motion.div
                key={ms.n}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{ position: "relative", zIndex: 1, paddingRight: 18 }}
              >
                <div style={{
                  width: 68, height: 68, borderRadius: "50%", background: "#fff", border: "2px solid #5FB14E",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.7rem", color: "#15314C",
                  boxShadow: "0 10px 24px -14px rgba(14,36,56,.5)", marginBottom: 22,
                }}>
                  {ms.n}
                </div>
                <h4 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1.06rem", fontWeight: 800, letterSpacing: ".02em", textTransform: "uppercase", color: "#15314C", margin: "0 0 8px" }}>
                  {ms.title}
                </h4>
                <p style={{ fontSize: ".95rem", color: "#5d6f7c", paddingRight: 14, lineHeight: 1.6 }}>{ms.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ marginTop: 54, fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.5rem", color: "#15314C", textAlign: "center", maxWidth: "30ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.35 }}
          >
            « Faites le point pour mieux <strong style={{ fontStyle: "normal", fontWeight: 600, color: "#2C8E86" }}>rebondir.</strong> »
          </motion.p>
        </div>
      </section>

      {/* ======================== POURQUOI ======================== */}
      <section style={{ padding: "108px 0" }} id="pourquoi">
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ marginBottom: 56, maxWidth: 680 }}>
            <span className="eyebrow">Pourquoi Le Bon Rebond</span>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem, 3.6vw, 2.9rem)", fontWeight: 500, letterSpacing: "-.02em", margin: "18px 0 0", color: "#15314C" }}>
              Une plateforme, mais surtout des humains à vos côtés.
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 64px" }} className="why-grid">
            {values.map((v, i) => (
              <motion.div
                key={v.n}
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, padding: "28px 0", borderTop: "1px solid rgba(21,49,76,.12)", alignItems: "start" }}
              >
                <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.3rem", color: "#3d8c45", lineHeight: 1, paddingTop: 4 }}>{v.n}</span>
                <div>
                  <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.4rem", fontWeight: 500, margin: "0 0 8px", color: "#15314C" }}>{v.title}</h4>
                  <p style={{ color: "#5d6f7c", fontSize: "1.02rem", lineHeight: 1.65 }}>{v.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== TÉMOIGNAGE ======================== */}
      <section style={{ background: "#fff", borderTop: "1px solid rgba(21,49,76,.12)", padding: "108px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: 60, alignItems: "center" }} className="proof-grid">
            {/* Photo */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              style={{ width: "100%", height: 440, borderRadius: 26, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/photos/temoignage-camille.webp" alt="Camille R., reconversion réussie vers les métiers du numérique" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </motion.div>

            {/* Citation */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}>
              <span className="eyebrow">Ils ont rebondi</span>
              <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontWeight: 400, fontSize: "clamp(1.7rem, 3vw, 2.4rem)", lineHeight: 1.32, color: "#15314C", letterSpacing: "-.01em", marginTop: 24 }}>
                <span style={{ color: "#5FB14E", fontStyle: "italic" }}>«</span>{" "}
                J'ai enfin trouvé une formation adaptée à mon projet en moins d'une semaine. Pour la première fois depuis des mois, je savais exactement où j'allais.{" "}
                <span style={{ color: "#5FB14E", fontStyle: "italic" }}>»</span>
              </p>
              <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/photos/temoignage-camille-avatar.webp" alt="Camille R." loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#15314C" }}>Camille R.</div>
                  <div style={{ color: "#5d6f7c", fontSize: ".92rem" }}>Reconversion vers les métiers du numérique</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ======================== POUR LES CENTRES (B2B) ======================== */}
      <section style={{ background: "#F3E9D7", padding: "104px 0" }} id="centres">
        <div className="container">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ position: "relative", overflow: "hidden", background: "#15314C", borderRadius: 32, padding: "62px 56px", boxShadow: "0 30px 70px -40px rgba(14,36,56,.6)" }}
          >
            <div style={{ position: "absolute", width: 440, height: 440, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.18)", right: -140, top: -160, pointerEvents: "none" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 52, alignItems: "center", position: "relative", zIndex: 1 }} className="centres-grid">
              <div>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: ".78rem", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#5FB14E", display: "inline-flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 30, height: 2, background: "#5FB14E", display: "inline-block" }} />
                  Vous êtes un centre de formation
                </span>
                <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2rem,3.6vw,2.9rem)", fontWeight: 400, letterSpacing: "-.02em", margin: "18px 0 0" }}>
                  Proposez vos formations et{" "}
                  <em style={{ fontStyle: "italic", color: "#cdeecb" }}>pilotez votre activité.</em>
                </h2>
                <p style={{ color: "rgba(255,255,255,.82)", fontSize: "1.12rem", lineHeight: 1.65, margin: "20px 0 32px", maxWidth: "52ch" }}>
                  Rejoignez le réseau Le Bon Rebond : publiez votre catalogue, recevez des demandes qualifiées, et gérez sessions, formateurs, documents et qualité depuis un cockpit unique.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <Link href="/centres" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.02rem", textDecoration: "none", lineHeight: 1 }}>
                    Rejoindre le réseau <span>→</span>
                  </Link>
                  <Link href="/register#centre" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 30px", borderRadius: 100, fontWeight: 700, fontSize: "1.02rem", border: "1.5px solid rgba(255,255,255,.35)", color: "#fff", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                    Créer mon espace
                  </Link>
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Publiez votre catalogue sur la marketplace",
                  "Recevez des demandes qualifiées, directement dans votre CRM",
                  "Planning, formateurs, documents & qualité centralisés",
                  "Essai sans engagement, données de démo identifiées",
                ].map((t) => (
                  <li key={t} style={{ display: "flex", gap: 14, alignItems: "flex-start", color: "rgba(255,255,255,.9)", fontSize: "1.02rem", lineHeight: 1.5 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(95,177,78,.18)", color: "#5FB14E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, fontSize: ".8rem", fontWeight: 700 }}>✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ======================== CTA FINAL ======================== */}
      <section style={{ position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#15314C,#23756e)", color: "#fff", textAlign: "center", padding: "104px 0" }}>
        {/* Arcs décoratifs */}
        <div style={{ position: "absolute", borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.12)", zIndex: 1, width: 680, height: 680, left: -160, bottom: -320, pointerEvents: "none" }} />
        <div style={{ position: "absolute", borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.22)", zIndex: 1, width: 520, height: 520, right: -120, top: -220, pointerEvents: "none" }} />

        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.2rem, 4.4vw, 3.4rem)", fontWeight: 400, margin: 0 }}>
              Prêt à relancer votre{" "}
              <em style={{ fontStyle: "italic", color: "#cdeecb" }}>parcours professionnel</em>{" "}
              ?
            </h2>
            <p style={{ margin: "22px auto 38px", fontSize: "1.18rem", color: "rgba(255,255,255,.86)", maxWidth: "54ch", lineHeight: 1.6 }}>
              Ne restez pas bloqué dans le doute. Le Bon Rebond vous aide à passer à l'action dès aujourd'hui — avec une direction claire et les bons partenaires.
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/formation" className="btn-cta" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "19px 34px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", textDecoration: "none", lineHeight: 1 }}>
                Trouver une formation <span>→</span>
              </Link>
              <Link href="/bilan-de-competences" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "17px 32px", borderRadius: 100, fontWeight: 700, fontSize: "1.05rem", border: "1.5px solid rgba(255,255,255,.35)", color: "#fff", textDecoration: "none", background: "transparent", lineHeight: 1 }}>
                Faire un bilan de compétences
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Responsive styles page d'accueil */}
      <style>{`
        @media (max-width: 980px) {
          .hero-grid,
          .proof-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .problem-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .steps-grid { grid-template-columns: 1fr 1fr !important; gap: 40px 30px !important; }
          .method-head-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
          .method-row { grid-template-columns: 1fr 1fr !important; gap: 40px 24px !important; }
          .why-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .path-cards-grid { grid-template-columns: 1fr !important; }
          .centres-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
        @media (max-width: 640px) {
          .steps-grid,
          .method-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
