"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { submitContactRequest } from "./actions";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  border: "1.5px solid rgba(21,49,76,.18)",
  borderRadius: 12,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: "1rem",
  background: "#FAF5EC",
  color: "#1b2b38",
  outline: "none",
  transition: "border-color .2s ease, background .2s ease",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  fontSize: ".88rem",
  fontWeight: 700,
  color: "#15314C",
  display: "block",
  marginBottom: 8,
};

const PHONE_DISPLAY = "+33 7 83 96 01 92";
const PHONE_WA = "33783960192";
const CONTACT_EMAIL = "contact.lebondrebond@gmail.com";

const WA_MESSAGE = encodeURIComponent(
  "Bonjour, je suis intéressé(e) par vos services de reconversion professionnelle (Le Bon Rebond). Pourriez-vous me recontacter pour en discuter ? Merci !"
);
const MAIL_SUBJECT = encodeURIComponent("Demande d'information — Le Bon Rebond");
const MAIL_BODY = encodeURIComponent(
  "Bonjour,\n\nJe souhaite en savoir plus sur vos services d'accompagnement à la reconversion professionnelle.\n\nMon besoin : \nMon téléphone : \n\nCordialement,"
);

const channels = [
  {
    k: "Le plus rapide",
    v: "WhatsApp & appel",
    s: `${PHONE_DISPLAY} — du lundi au vendredi, 9h à 18h.`,
    accent: true,
    href: `https://wa.me/${PHONE_WA}?text=${WA_MESSAGE}`,
  },
  {
    k: "Par email",
    v: CONTACT_EMAIL,
    s: "Réponse sous 24 à 48h ouvrées.",
    href: `mailto:${CONTACT_EMAIL}?subject=${MAIL_SUBJECT}&body=${MAIL_BODY}`,
  },
  {
    k: "Centres de formation",
    v: "Devenir partenaire",
    s: "Gagnez en visibilité et recevez des demandes qualifiées. Indiquez « centre de formation » dans votre message.",
    href: "/centres",
  },
  {
    k: "Modalités",
    v: "Consultations en présentiel ou en visio",
    s: "",
    href: "#form",
  },
];

export default function ContactPage() {
  const [audience, setAudience] = useState<"particulier" | "centre">("particulier");
  const [form, setForm] = useState({ name: "", email: "", phone: "", situation: "", message: "", website: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await submitContactRequest({ ...form, situation: audience === "centre" ? "centre-formation" : form.situation });
    setSubmitting(false);
    if (!res.ok) { setError(res.error ?? "Une erreur est survenue. Réessayez."); return; }
    setSent(true);
    setForm({ name: "", email: "", phone: "", situation: "", message: "", website: "" });
  };

  const pillBase: CSSProperties = { padding: "12px 22px", borderRadius: 100, border: "1.5px solid rgba(21,49,76,.18)", fontWeight: 700, fontSize: ".96rem", cursor: "pointer", background: "transparent", color: "#5d6f7c", fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all .2s" };
  const pillActive: CSSProperties = { ...pillBase, background: "#15314C", color: "#fff", borderColor: "#15314C" };

  return (
    <>
      {/* ── SUBHERO centré ── */}
      <section style={{ position: "relative", overflow: "hidden", padding: "72px 0 48px", textAlign: "center" }}>
        <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(95,177,78,.14),transparent 70%)", top: -120, left: "50%", transform: "translateX(-50%)", pointerEvents: "none", zIndex: 0 }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} style={{ maxWidth: 780, margin: "0 auto" }}>
            <div style={{ fontSize: ".84rem", color: "#5d6f7c", fontWeight: 600, marginBottom: 22, letterSpacing: ".01em" }}>
              <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>Accueil</Link>
              {" · "}
              <b style={{ color: "#23756e", fontWeight: 700 }}>Contact</b>
            </div>
            <h1
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontSize: "clamp(2.4rem, 4.8vw, 3.9rem)",
                fontWeight: 400,
                letterSpacing: "-.03em",
                color: "#15314C",
                margin: "0 0 22px",
              }}
            >
              Parlons de votre{" "}
              <em style={{ fontStyle: "italic", color: "#2C8E86" }}>projet.</em>
            </h1>
            <p style={{ fontSize: "1.18rem", color: "#5d6f7c", lineHeight: 1.65, maxWidth: "62ch", margin: "0 auto" }}>
              Une question, une envie de reconversion, ou vous représentez un centre de formation ? Écrivez-nous : un échange humain, une réponse claire.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── FORMULAIRE + CANAUX ── */}
      <section style={{ padding: "40px 0 108px" }} id="form">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 54, alignItems: "start" }} className="contact-page-grid">

            {/* Formulaire */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              {/* Toggle audience */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 34 }} role="group" aria-label="Vous êtes">
                <button type="button" style={audience === "particulier" ? pillActive : pillBase} onClick={() => setAudience("particulier")}>
                  Je suis un particulier
                </button>
                <button type="button" style={audience === "centre" ? pillActive : pillBase} onClick={() => setAudience("centre")}>
                  Je suis un centre de formation
                </button>
              </div>

              {sent ? (
                <div style={{ background: "#fff", border: "1px solid rgba(21,49,76,.12)", borderRadius: 24, padding: 48, textAlign: "center", boxShadow: "0 18px 50px -28px rgba(14,36,56,.45)" }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(95,177,78,.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <span style={{ fontSize: "1.8rem" }}>✓</span>
                  </div>
                  <h3 style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.6rem", fontWeight: 500, color: "#15314C", margin: "0 0 10px" }}>Message envoyé !</h3>
                  <p style={{ color: "#5d6f7c", fontSize: "1rem" }}>Nous vous recontactons sous 24 à 48h ouvrées.</p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{ background: "#fff", border: "1px solid rgba(21,49,76,.12)", borderRadius: 24, padding: 38, boxShadow: "0 18px 50px -28px rgba(14,36,56,.45)", display: "flex", flexDirection: "column", gap: 20 }}
                >
                  <div style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" }} aria-hidden="true">
                    <label htmlFor="contact-website">Site web</label>
                    <input
                      id="contact-website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="form-row">
                    <div>
                      <label htmlFor="nom" style={labelStyle}>Nom complet</label>
                      <input id="nom" type="text" placeholder="Votre nom" required style={fieldStyle} value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; e.currentTarget.style.background = "#FAF5EC"; }} />
                    </div>
                    <div>
                      <label htmlFor="tel" style={labelStyle}>Téléphone</label>
                      <input id="tel" type="tel" placeholder="06 00 00 00 00" style={fieldStyle} value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; e.currentTarget.style.background = "#fff"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; e.currentTarget.style.background = "#FAF5EC"; }} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" style={labelStyle}>Email</label>
                    <input id="email" type="email" placeholder="vous@email.fr" required style={fieldStyle} value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; e.currentTarget.style.background = "#fff"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; e.currentTarget.style.background = "#FAF5EC"; }} />
                  </div>

                  <div>
                    <label htmlFor="sujet" style={labelStyle}>Votre besoin</label>
                    <select id="sujet" style={fieldStyle} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; }}>
                      <option value="">Choisir...</option>
                      <option value="formation">Trouver une formation</option>
                      <option value="bilan-competences">Faire un bilan de compétences</option>
                      <option value="bilan-orientation">Bilan d'orientation (élève / étudiant)</option>
                      <option value="centre-formation">Devenir centre partenaire</option>
                      <option value="autre">Autre question</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="msg" style={labelStyle}>Votre message</label>
                    <textarea id="msg" placeholder="Décrivez votre situation en quelques mots…" rows={5}
                      style={{ ...fieldStyle, resize: "vertical", minHeight: 120, padding: "14px 16px" } as CSSProperties}
                      value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2C8E86"; e.currentTarget.style.background = "#fff"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(21,49,76,.18)"; e.currentTarget.style.background = "#FAF5EC"; }}
                    />
                  </div>

                  {error && (
                    <div style={{ background: "rgba(220,81,71,.08)", border: "1px solid rgba(220,81,71,.25)", borderRadius: 12, padding: "12px 16px", color: "#c43d34", fontSize: ".9rem", fontWeight: 600 }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "17px 28px", borderRadius: 100, background: submitting ? "#5d6f7c" : "#B85B22", color: "#fff", fontWeight: 700, fontSize: "1.05rem", border: "none", cursor: submitting ? "not-allowed" : "pointer", width: "100%", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {submitting ? "Envoi…" : <>Envoyer ma demande <span>→</span></>}
                  </button>

                  <p style={{ fontSize: ".82rem", color: "#5f6977", lineHeight: 1.5, textAlign: "center" }}>
                    En envoyant ce formulaire, vous acceptez d'être recontacté par Le Bon Rebond. Vos informations restent confidentielles.
                  </p>
                </form>
              )}
            </motion.div>

            {/* Canaux */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {channels.map((ch, i) => (
                <motion.div key={ch.k} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i} variants={fadeUp}>
                  <a
                    href={ch.href}
                    style={{
                      display: "block",
                      minWidth: 0,
                      background: ch.accent ? "#15314C" : "#F3E9D7",
                      borderRadius: 20,
                      padding: "26px 28px",
                      textDecoration: "none",
                      transition: "transform .2s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
                  >
                    <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: ch.accent ? "#5FB14E" : "#23756e", marginBottom: 8 }}>
                      {ch.k}
                    </div>
                    <div style={{ fontFamily: "'Newsreader', Georgia, serif", fontSize: "1.5rem", color: ch.accent ? "#fff" : "#15314C", fontWeight: 500, lineHeight: 1.2, overflowWrap: "anywhere" }}>
                      {ch.v}
                    </div>
                    <div style={{ color: ch.accent ? "rgba(255,255,255,.72)" : "#536673", fontSize: ".96rem", marginTop: 6, lineHeight: 1.55 }}>
                      {ch.s}
                    </div>
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BANDEAU NAVY ── */}
      <section style={{ position: "relative", overflow: "hidden", background: "#15314C", color: "#fff", textAlign: "center", padding: "96px 0" }}>
        <div style={{ position: "absolute", zIndex: 1, width: 780, height: 780, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.10)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", zIndex: 1, width: 1100, height: 1100, borderRadius: "50%", border: "1.5px solid rgba(95,177,78,.16)", left: "50%", top: "50%", transform: "translate(-50%,-46%)", pointerEvents: "none" }} />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <p style={{ color: "#5FB14E", fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", fontSize: ".82rem", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>
              Le bon moment
            </p>
            <h2 style={{ fontFamily: "'Newsreader', Georgia, serif", color: "#fff", fontSize: "clamp(2.1rem, 4.6vw, 3.5rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.18, maxWidth: "22ch", margin: "0 auto" }}>
              Votre prochaine étape commence par un simple message.
            </h2>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 980px) {
          .contact-page-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
