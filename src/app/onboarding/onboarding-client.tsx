"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { completeOnboarding, type OnboardingState } from "@/server/onboarding-actions";

const GOALS = [
  ["PLANIFIER", "Mieux planifier", "Réduire les conflits et remplir le calendrier.", "calendar-range"],
  ["VENDRE", "Mieux vendre", "Piloter les prospects et les relances.", "target"],
  ["DOCUMENTS", "Centraliser les documents", "Générer et retrouver les pièces utiles.", "file-text"],
  ["APPRENANTS", "Suivre les apprenants", "Centraliser inscriptions et progression.", "grad"],
  ["CENTRALISER", "Piloter l'activité", "Réunir les indicateurs clés du centre.", "dashboard"],
] as const;

const STEPS = ["Votre centre", "Votre objectif", "Configuration"];

type Defaults = {
  website: string;
  nbFormationsDeclarees: number;
  nbFormateursDeclares: number;
  nbSessionsMois: number;
  objectifPrincipal: string;
};

export function OnboardingClient({ organizationName, defaults }: { organizationName: string; defaults: Defaults }) {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState(defaults.objectifPrincipal || "CENTRALISER");
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, undefined);

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      {/* ── Panneau latéral sombre (maquette Onboarding.html) ── */}
      <aside className="ob-aside" style={{ width: 380, flex: "none", background: "var(--ink)", color: "#fff", padding: 40, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(70px)", opacity: .35, width: 260, height: 260, background: "#2f9488", top: -80, right: -60 }} />
        <div style={{ position: "absolute", borderRadius: "50%", filter: "blur(70px)", opacity: .2, width: 200, height: 200, background: "#7ec64a", bottom: 40, left: -60 }} />

        {/* Marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2469a6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l5-5 4 3 7-8" /><path d="M16 4h4v4" /></svg>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Le Bon Rebond</div>
            <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(255,255,255,.6)", marginTop: 2 }}>Formation</div>
          </div>
        </div>

        {/* Étapes */}
        <div style={{ marginTop: 56, position: "relative", flex: 1 }}>
          <h2 style={{ color: "#fff", fontSize: 24, lineHeight: 1.2, marginBottom: 8 }}>Créons votre cockpit</h2>
          <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.55, marginBottom: 40 }}>
            Trois étapes rapides et votre espace de pilotage est prêt à l&apos;emploi.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {STEPS.map((s, i) => {
              const n = i + 1;
              const stepState = step > n ? "done" : step === n ? "active" : "todo";
              return (
                <div key={s} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 13, flex: "none", transition: "all .25s",
                    background: stepState === "done" ? "#7ec64a" : stepState === "active" ? "#fff" : "rgba(255,255,255,.12)",
                    color: stepState === "active" ? "#2469a6" : stepState === "done" ? "#062e22" : "rgba(255,255,255,.5)",
                  }}>
                    {stepState === "done" ? <Icon name="check" size={16} /> : n}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: stepState === "todo" ? "rgba(255,255,255,.45)" : "#fff" }}>{s}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.45)", marginTop: 2 }}>Étape {n} sur 3</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position: "relative", fontSize: 12.5, color: "rgba(255,255,255,.4)" }}>Sans engagement · 0 € pour démarrer</div>
      </aside>

      {/* ── Zone principale ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, position: "relative" }}>
        <div style={{ width: "100%", maxWidth: 560 }} className="fade-up" key={step}>
          <div style={{ marginBottom: 28 }}>
            <span className="eyebrow">Étape {step} / 3</span>
            <h1 style={{ fontSize: 28, marginTop: 10, letterSpacing: "-0.03em" }}>
              {step === 1 ? `Parlez-nous de ${organizationName}` : step === 2 ? "Quel est votre objectif principal ?" : "Première configuration rapide"}
            </h1>
            <p style={{ color: "var(--ink-2)", fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>
              {step === 1
                ? "Ces informations personnalisent votre cockpit. Vous pourrez les modifier à tout moment."
                : step === 2
                ? "Nous mettrons en avant les outils les plus utiles pour vous."
                : "Ajoutez vos premiers éléments — ou passez et faites-le plus tard."}
            </p>
          </div>

          <form action={action}>
            {/* Étape 1 — Votre centre */}
            <section style={{ display: step === 1 ? "block" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label className="field-label" htmlFor="website">Site web</label>
                  <input className="input" id="website" name="website" type="url" defaultValue={defaults.website} placeholder="https://mon-centre.fr" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="nbFormationsDeclarees">Nombre de formations</label>
                    <input className="input tnum" id="nbFormationsDeclarees" name="nbFormationsDeclarees" type="number" min={0} defaultValue={defaults.nbFormationsDeclarees} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="nbFormateursDeclares">Nombre de formateurs</label>
                    <input className="input tnum" id="nbFormateursDeclares" name="nbFormateursDeclares" type="number" min={0} defaultValue={defaults.nbFormateursDeclares} />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="nbSessionsMois">Sessions par mois</label>
                  <input className="input tnum" id="nbSessionsMois" name="nbSessionsMois" type="number" min={0} defaultValue={defaults.nbSessionsMois} />
                </div>
              </div>
            </section>

            {/* Étape 2 — Votre objectif */}
            <section style={{ display: step === 2 ? "block" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {GOALS.map(([value, title, text, icon]) => {
                  const sel = goal === value;
                  return (
                    <label
                      key={value}
                      style={{
                        border: `1.5px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 14, padding: 18, cursor: "pointer", transition: "all .16s",
                        display: "flex", alignItems: "center", gap: 14, textAlign: "left",
                        background: sel ? "var(--primary-tint)" : "var(--surface)",
                        boxShadow: sel ? "0 0 0 3px var(--primary-50)" : "none",
                      }}
                    >
                      <input
                        type="radio" name="objectifPrincipal" value={value} checked={sel}
                        onChange={() => setGoal(value)}
                        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                      />
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: sel ? "var(--primary)" : "var(--primary-50)", color: sel ? "#fff" : "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", transition: "all .16s" }}>
                        <Icon name={icon} size={21} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
                        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{text}</div>
                      </div>
                      <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${sel ? "var(--primary)" : "var(--border-strong)"}`, background: sel ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                        {sel && <Icon name="check" size={13} style={{ color: "#fff" }} />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Étape 3 — Configuration */}
            <section style={{ display: step === 3 ? "block" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="field-label" htmlFor="starterTitle">Première formation</label>
                  <input className="input" id="starterTitle" name="starterTitle" placeholder="Ex : Excel avancé pour PME" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="field-label" htmlFor="starterTrainer">Premier formateur</label>
                    <input className="input" id="starterTrainer" name="starterTrainer" placeholder="Ex : Claire Martin" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="starterSessionDate">Date de première session</label>
                    <input className="input" id="starterSessionDate" name="starterSessionDate" type="date" />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="starterProspect">Premier prospect</label>
                  <input className="input" id="starterProspect" name="starterProspect" placeholder="Ex : Cabinet Nova RH" />
                </div>
                <label style={{ border: "1.5px solid var(--border)", borderRadius: 14, padding: 16, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start", background: "var(--surface)" }}>
                  <input type="checkbox" name="loadDemo" style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--primary)" }} />
                  <span>
                    <strong style={{ fontSize: 14, display: "block" }}>Créer des exemples de démarrage si je laisse les champs vides</strong>
                    <small style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Ils restent clairement identifiés et entièrement modifiables.</small>
                  </span>
                </label>
              </div>
            </section>

            {state?.error && <div className="badge badge-danger" style={{ marginTop: 16 }}>{state.error}</div>}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, alignItems: "center" }}>
              {step > 1 ? (
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => setStep(step - 1)}>
                  <Icon name="chevron-left" size={18} /> Retour
                </button>
              ) : (
                <Link href="/dashboard" className="btn btn-ghost btn-lg">Passer pour l&apos;instant</Link>
              )}
              {step < 3 ? (
                <button type="button" className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)}>
                  Continuer <Icon name="arrow-right" size={18} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
                  {pending ? "Préparation…" : <>Terminer <Icon name="check" size={18} /></>}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>

      <style>{`
        @media (max-width: 820px) { .ob-aside { display: none !important; } }
      `}</style>
    </div>
  );
}
