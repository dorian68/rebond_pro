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
    <div data-slot={id} aria-label={alt} style={{ width: "100%", height: "100%", background: "#e3d7c0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: ".82rem", color: "rgba(21,49,76,.45)", fontWeight: 600, padding: "0 20px", textAlign: "center" }}>{alt}</span>
    </div>
  );
}

const VALEURS = [
  { vn: "i.", title: "Clarté", desc: "Parce qu'une personne qui doute a besoin d'un chemin simple, compréhensible et rassurant." },
  { vn: "ii.", title: "Utilité", desc: "Parce qu'une plateforme ne vaut que si elle répond à un vrai problème et apporte une aide concrète." },
  { vn: "iii.", title: "Proximité", desc: "Parce que chaque territoire a ses réalités, ses besoins, ses talents et ses opportunités." },
  { vn: "iv.", title: "Ambition", desc: "Parce que nous voulons un impact réel sur l'emploi, la formation et le développement local." },
  { vn: "v.", title: "Innovation responsable", desc: "Parce que la technologie doit rester au service de l'humain, et non l'inverse." },
];

export default function AProposPage() {
  return (
    <>
      {/* ─── SUBHERO ─── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 48px", textAlign: "center", background: "#FAF5EC" }}>
        <div style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle,rgba(44,142,134,.14),transparent 70%)", top: -120, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22 }}>
              <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
              {" · "}
              <b style={{ color: "#23756e" }}>À propos</b>
            </div>
            <h1 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2.4rem,4.8vw,3.9rem)", fontWeight: 400, letterSpacing: "-.03em", color: "#15314C", margin: "0 0 22px", lineHeight: 1.12 }}>
              Redonner une direction à celles et ceux qui{" "}
              <em style={{ fontStyle: "italic", color: "#2C8E86" }}>cherchent leur voie.</em>
            </h1>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "64ch", margin: "0 auto" }}>
              Le Bon Rebond est né d&apos;une conviction simple : personne ne devrait rester seul face à ses doutes professionnels. Nous construisons un espace clair, humain et utile pour aider chacun à mieux se connaître, comprendre ses opportunités et trouver la formation adaptée à son projet.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── PHOTO LARGE ─── */}
      <section className="container" style={{ paddingBottom: 20 }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          style={{ height: 440, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 60px -34px rgba(14,36,56,.55)" }}>
          <ImgSlot id="ap-team" alt="Photo — une scène d'accompagnement humaine et chaleureuse, ou le territoire (Guadeloupe)" />
        </motion.div>
      </section>

      {/* ─── FONDATEURS ─── */}
      <section id="fondateurs" style={{ background: "#F3E9D7", padding: "104px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 760, marginBottom: 64 }}>
            <span className="eyebrow">Les fondateurs</span>
            <h2 className="ap-section-h2" style={{ marginTop: 18 }}>Deux profils, une même conviction.</h2>
            <p style={{ fontSize: "1.14rem", color: "#5d6f7c", lineHeight: 1.65, marginTop: 20, maxWidth: "62ch" }}>
              Le Bon Rebond est né de la rencontre entre l&apos;ancrage terrain et la vision technologique — deux parcours complémentaires au service du rebond professionnel.
            </p>
          </motion.div>

          {/* Mathurin */}
          <motion.article initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            className="ap-founder">
            <div className="ap-founder-portrait">
              <Image src="/photos/mathurin-suffrin.jpg" alt="Mathurin Suffrin, cofondateur du Bon Rebond" fill style={{ objectFit: "cover", objectPosition: "center top" }} sizes="(max-width:880px) 100vw, 400px" />
            </div>
            <div>
              <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#23756e" }}>Cofondateur · Ancrage terrain &amp; entrepreneuriat</div>
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.2vw,2.6rem)", fontWeight: 500, color: "#15314C", letterSpacing: "-.02em", margin: "12px 0 6px", lineHeight: 1.05 }}>Mathurin Suffrin</h3>
              <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.2rem", color: "#2C8E86", marginBottom: 24 }}>Ingénieur génie civil &amp; bâtiment, entrepreneur du développement local.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "1.06rem", color: "#5d6f7c", lineHeight: 1.7 }}>
                <p style={{ margin: 0 }}>
                  Basé en Guadeloupe, Mathurin développe depuis plusieurs années des projets à la croisée du bâtiment, de l&apos;immobilier, du numérique et de l&apos;accompagnement entrepreneurial. Diplômé de <strong style={{ color: "#15314C", fontWeight: 600 }}>Polytech Annecy-Chambéry</strong> (Génie Civil, Bâtiment, Énergie et Environnement), il possède une solide expérience en maîtrise d&apos;œuvre, assistance à maîtrise d&apos;ouvrage, pilotage de chantiers (OPC), rénovation énergétique et conduite de travaux.
                </p>
                <p style={{ margin: 0 }}>Parallèlement à son activité d&apos;ingénieur chez Carrez &amp; Associés, il a fondé et cofondé plusieurs entreprises à fort impact territorial :</p>
                <ul className="ap-vlist">
                  <li><strong>Mon Artisan Préféré</strong> — premier réseau local de mise en relation entre particuliers et artisans qualifiés en Savoie et Haute-Savoie.</li>
                  <li><strong>MAPassistance</strong> — plateforme d&apos;assistanat administratif dédiée aux professionnels du bâtiment et du BTP.</li>
                  <li><strong>Altiora Capital Club</strong> — club d&apos;investissement immobilier pour les investisseurs des territoires insulaires francophones.</li>
                  <li><strong>Indivision Solutions Guadeloupe</strong> — accompagnement des dossiers d&apos;indivision et de succession immobilière.</li>
                </ul>
                <p style={{ margin: 0 }}>
                  Très impliqué dans la vie associative, il préside <strong style={{ color: "#15314C", fontWeight: 600 }}>iinmyart</strong> (promotion de l&apos;art numérique) et a fondé <strong style={{ color: "#15314C", fontWeight: 600 }}>DiTas</strong> (Numérique Tout Âge Savoie), qui accompagne les personnes âgées dans leur usage du numérique.
                </p>
                <p style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.14rem", color: "#15314C", lineHeight: 1.5 }}>
                  Avec Le Bon Rebond, il apporte sa connaissance du terrain, son expérience de créateur d&apos;entreprise et sa volonté de rapprocher talents, centres de formation et opportunités économiques en Guadeloupe.
                </p>
              </div>
            </div>
          </motion.article>

          {/* Dorian */}
          <motion.article initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.5} variants={fadeUp}
            className="ap-founder ap-founder-rev">
            <div className="ap-founder-portrait">
              <Image src="/photos/dorian-labry.jpg" alt="Dorian Labry, cofondateur du Bon Rebond" fill style={{ objectFit: "cover", objectPosition: "center top" }} sizes="(max-width:880px) 100vw, 400px" />
            </div>
            <div>
              <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase" as const, color: "#23756e" }}>Cofondateur · Technologie &amp; produit</div>
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(2rem,3.2vw,2.6rem)", fontWeight: 500, color: "#15314C", letterSpacing: "-.02em", margin: "12px 0 6px", lineHeight: 1.05 }}>Dorian Labry</h3>
              <p style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.2rem", color: "#2C8E86", marginBottom: 24 }}>Ingénieur financier, fondateur d&apos;OptiQuant IA, spécialiste IA &amp; automatisation.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: "1.06rem", color: "#5d6f7c", lineHeight: 1.7 }}>
                <p style={{ margin: 0 }}>
                  Formé en ingénierie financière puis en finance quantitative à <strong style={{ color: "#15314C", fontWeight: 600 }}>Paris Dauphine</strong> et à l&apos;<strong style={{ color: "#15314C", fontWeight: 600 }}>ENSAE Paris</strong>, Dorian a travaillé dans des environnements exigeants de finance de marché — autour du risque, du PnL, du reporting, de l&apos;analyse de données et de l&apos;automatisation de processus.
                </p>
                <p style={{ margin: 0 }}>Après plusieurs expériences dans de grands groupes financiers, il fonde <strong style={{ color: "#15314C", fontWeight: 600 }}>OptiQuant IA</strong>, une société dédiée à la recherche, l&apos;ingénierie appliquée et la transformation digitale. Il y conçoit :</p>
                <ul className="ap-vlist">
                  <li><strong>Outils SaaS</strong> sur mesure pour des cas d&apos;usage métiers concrets.</li>
                  <li><strong>Copilotes IA</strong> et systèmes d&apos;aide à la décision.</li>
                  <li><strong>Automatisation</strong> de processus complexes, de bout en bout.</li>
                </ul>
                <p style={{ margin: 0, fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.14rem", color: "#15314C", lineHeight: 1.5 }}>
                  Avec Le Bon Rebond, il apporte la vision technologique et produit : transformer une problématique humaine et territoriale en une plateforme digitale robuste, moderne et utile — l&apos;IA et l&apos;automatisation au service de l&apos;orientation.
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </section>

      {/* ─── COMPLÉMENTARITÉ ─── */}
      <section style={{ padding: "96px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
            style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
            <span className="eyebrow ap-eyebrow-center">Une complémentarité</span>
            <blockquote style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "clamp(1.6rem,3vw,2.3rem)", fontWeight: 400, fontStyle: "italic", color: "#15314C", lineHeight: 1.4, marginTop: 24, letterSpacing: "-.01em" }}>
              <span style={{ color: "#5FB14E" }}>«</span>
              {" "}Le rebond professionnel ne doit pas être réservé à ceux qui ont déjà les bons codes, les bons contacts ou la bonne information. Il doit devenir plus accessible, plus lisible et plus concret.{" "}
              <span style={{ color: "#5FB14E" }}>»</span>
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ─── HISTOIRE / POURQUOI ─── */}
      <section style={{ padding: "100px 0", borderTop: "1px solid rgba(21,49,76,.07)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 60, alignItems: "start" }} className="ap-prose-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Pourquoi ce projet existe</span>
              <h2 className="ap-section-h2" style={{ marginTop: 18 }}>Un constat, devenu une mission.</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: "1.1rem", color: "#5d6f7c", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                Beaucoup de personnes souhaitent évoluer professionnellement, mais <strong style={{ color: "#15314C", fontWeight: 600 }}>ne savent pas par où commencer.</strong> Elles ont des compétences, de l&apos;expérience, de la motivation — mais manquent de clarté sur la prochaine étape. Quelle formation choisir ? Vers quel métier aller ? Comment transformer une envie de changement en plan concret ?
              </p>
              <p style={{ margin: 0 }}>
                En parallèle, de nombreux centres de formation disposent d&apos;une vraie expertise, mais peinent à rendre leur offre visible, lisible et accessible. Le besoin existe, l&apos;offre existe, mais <strong style={{ color: "#15314C", fontWeight: 600 }}>la connexion entre les deux reste souvent imparfaite.</strong>
              </p>
              <p style={{ margin: 0 }}>
                Le Bon Rebond a été pensé pour répondre à ce manque : rendre l&apos;orientation plus simple, plus humaine et plus intelligente — et donner aux acteurs de la formation des outils adaptés à leurs réalités.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── DEUX PUBLICS ─── */}
      <section style={{ background: "#fff", borderTop: "1px solid rgba(21,49,76,.08)", borderBottom: "1px solid rgba(21,49,76,.08)", padding: "100px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 720, marginBottom: 54 }}>
            <span className="eyebrow">Notre mission</span>
            <h2 className="ap-section-h2" style={{ marginTop: 18 }}>Deux publics qui ont besoin l&apos;un de l&apos;autre.</h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }} className="ap-publics-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              style={{ background: "#FAF5EC", border: "1px solid rgba(21,49,76,.10)", borderRadius: 26, padding: "40px 38px", display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#23756e" }}>Les particuliers</span>
              <div style={{ width: 46, height: 3, borderRadius: 3, background: "#5FB14E" }} />
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.7rem", fontWeight: 500, color: "#15314C", lineHeight: 1.2 }}>Faire le point, et avancer</h3>
              <p style={{ fontSize: "1.04rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Personnes en reconversion, en recherche d&apos;emploi, en questionnement professionnel, ou simplement désireuses de donner un nouveau sens à leur parcours. Nous les aidons à clarifier leurs compétences, leurs envies et la prochaine étape.
              </p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={0.5} variants={fadeUp}
              style={{ background: "#FAF5EC", border: "1px solid rgba(21,49,76,.10)", borderRadius: 26, padding: "40px 38px", display: "flex", flexDirection: "column", gap: 16 }}>
              <span style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase" as const, color: "#C5662A" }}>Les centres de formation</span>
              <div style={{ width: 46, height: 3, borderRadius: 3, background: "#E07C39" }} />
              <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.7rem", fontWeight: 500, color: "#15314C", lineHeight: 1.2 }}>Développer leur activité</h3>
              <p style={{ fontSize: "1.04rem", color: "#5d6f7c", lineHeight: 1.65 }}>
                Des structures essentielles au développement des compétences, qui manquent parfois d&apos;outils modernes pour gagner en visibilité, mieux gérer leur activité, valoriser leurs formations et toucher les bons publics.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── HUMAIN + TECHNOLOGIE ─── */}
      <section style={{ padding: "100px 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 60, alignItems: "start" }} className="ap-prose-grid">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <span className="eyebrow">Notre approche</span>
              <h2 className="ap-section-h2" style={{ marginTop: 18 }}>Pensée pour l&apos;humain, renforcée par la technologie.</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1} variants={fadeUp}
              style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: "1.1rem", color: "#5d6f7c", lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>
                La technologie ne doit pas remplacer l&apos;accompagnement humain. Elle doit le rendre <strong style={{ color: "#15314C", fontWeight: 600 }}>plus accessible, plus rapide et plus efficace.</strong>
              </p>
              <p style={{ margin: 0 }}>
                La plateforme propose des outils simples pour réaliser un premier bilan, clarifier ses objectifs, identifier ses compétences et découvrir les formations pertinentes. Elle permet aussi aux centres de mieux présenter leurs offres, gérer leur visibilité, suivre leurs demandes et développer leur activité.
              </p>
              <p style={{ margin: 0 }}>
                Notre approche est pragmatique : partir des besoins réels, créer des outils utiles, et bâtir progressivement une solution capable d&apos;un <strong style={{ color: "#15314C", fontWeight: 600 }}>impact concret sur l&apos;emploi, la formation et le développement des compétences.</strong>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── VISION ─── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none", zIndex: 1 }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase" as const, fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Notre vision
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem,4.6vw,3.4rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.2, maxWidth: "24ch", margin: "0 auto" }}>
              Faire du rebond professionnel un chemin accessible à tous.
            </h2>
            <p style={{ position: "relative", zIndex: 2, color: "rgba(255,255,255,.78)", fontSize: "1.12rem", lineHeight: 1.65, maxWidth: "60ch", margin: "28px auto 0" }}>
              Dans des territoires comme la Guadeloupe — où les enjeux d&apos;emploi, de reconversion et de développement économique sont essentiels — mieux orienter les talents et mieux valoriser les acteurs de la formation peut avoir un impact profond.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── VALEURS ─── */}
      <section style={{ padding: "104px 0" }}>
        <div className="container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} style={{ maxWidth: 680, marginBottom: 58 }}>
            <span className="eyebrow">Nos valeurs</span>
            <h2 className="ap-section-h2" style={{ marginTop: 18 }}>Ce qui guide chacune de nos décisions.</h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "30px 34px" }} className="ap-valeurs-grid">
            {VALEURS.map((v, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i * 0.3} variants={fadeUp}
                style={{ paddingTop: 24, borderTop: "2px solid #5FB14E" }}>
                <span style={{ fontFamily: "'Newsreader', Georgia, serif", fontStyle: "italic", fontSize: "1.2rem", color: "rgba(21,49,76,.30)", lineHeight: 1 }}>{v.vn}</span>
                <h4 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", fontWeight: 500, color: "#15314C", margin: "10px 0" }}>{v.title}</h4>
                <p style={{ fontSize: "1.02rem", color: "#5d6f7c", lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
              </motion.div>
            ))}
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
              Le début d&apos;une <em style={{ fontStyle: "italic", color: "#2C8E86" }}>nouvelle trajectoire.</em>
            </h2>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "56ch", margin: "0 auto 40px" }}>
              Que vous soyez en reconversion, en réflexion sur votre avenir, formateur indépendant ou centre de formation, Le Bon Rebond a été pensé pour vous aider à avancer. Parce qu&apos;un parcours n&apos;est jamais figé.
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
        /* ── Eyebrow centré (la variante de base vit dans .vitrine .eyebrow globals.css) ── */
        .ap-eyebrow-center {
          justify-content: center;
        }
        /* ── Section h2 ── */
        .ap-section-h2 {
          font-family: 'Newsreader', Georgia, serif;
          font-size: clamp(2rem, 3.6vw, 2.9rem);
          font-weight: 400;
          color: #15314C;
          letter-spacing: -.025em;
          line-height: 1.2;
        }
        /* ── Founders layout ── */
        .ap-founder {
          display: grid;
          grid-template-columns: .72fr 1.28fr;
          gap: 54px;
          align-items: start;
          padding: 48px 0;
        }
        .ap-founder + .ap-founder {
          border-top: 1px solid rgba(21,49,76,.12);
        }
        .ap-founder-rev .ap-founder-portrait {
          order: 2;
        }
        .ap-founder-portrait {
          height: 460px;
          border-radius: 24px;
          overflow: hidden;
          background: #e3d7c0;
          box-shadow: 0 24px 60px -34px rgba(14,36,56,.5);
          position: relative;
        }
        /* ── Vlist ── */
        .ap-vlist {
          list-style: none;
          margin: 6px 0 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          border-top: 1px solid rgba(21,49,76,.12);
          padding-top: 22px;
        }
        .ap-vlist li {
          position: relative;
          padding-left: 22px;
          font-size: 1.02rem;
          color: #5d6f7c;
          line-height: 1.55;
        }
        .ap-vlist li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 9px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2C8E86;
        }
        .ap-vlist li strong {
          color: #15314C;
          font-weight: 700;
        }
        /* ── Responsive ── */
        @media (max-width: 880px) {
          .ap-prose-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .ap-publics-grid { grid-template-columns: 1fr !important; }
          .ap-founder { grid-template-columns: 1fr !important; gap: 28px !important; padding: 40px 0; }
          .ap-founder-rev .ap-founder-portrait { order: 0; }
          .ap-founder-portrait { height: 300px; }
          .ap-valeurs-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .ap-valeurs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
