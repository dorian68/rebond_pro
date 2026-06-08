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

type Defaults = {
  website: string;
  nbFormationsDeclarees: number;
  nbFormateursDeclares: number;
  nbSessionsMois: number;
  objectifPrincipal: string;
};

export function OnboardingClient({ organizationName, defaults }: { organizationName: string; defaults: Defaults }) {
  const [step, setStep] = useState(1);
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, undefined);

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card fade-up">
        <div className="onboarding-progress">
          {[1, 2, 3].map((n) => <span key={n} className={n <= step ? "active" : ""} />)}
        </div>
        <div className="onboarding-heading">
          <span className="eyebrow">Étape {step} sur 3</span>
          <h1>{step === 1 ? `Configurons ${organizationName}` : step === 2 ? "Quel est votre objectif prioritaire ?" : "Créez votre premier point de départ"}</h1>
          <p>{step === 1 ? "Ces repères personnalisent votre cockpit." : step === 2 ? "Le cockpit mettra les actions les plus utiles en avant." : "Ajoutez quelques éléments rapides ou chargez des exemples modifiables."}</p>
        </div>

        <form action={action}>
          <section style={{ display: step === 1 ? "block" : "none" }}>
            <div className="public-form-grid">
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label" htmlFor="website">Site web</label>
                <input className="input" id="website" name="website" type="url" defaultValue={defaults.website} placeholder="https://mon-centre.fr" />
              </div>
              <div>
                <label className="field-label" htmlFor="nbFormationsDeclarees">Nombre de formations</label>
                <input className="input" id="nbFormationsDeclarees" name="nbFormationsDeclarees" type="number" min={0} defaultValue={defaults.nbFormationsDeclarees} />
              </div>
              <div>
                <label className="field-label" htmlFor="nbFormateursDeclares">Nombre de formateurs</label>
                <input className="input" id="nbFormateursDeclares" name="nbFormateursDeclares" type="number" min={0} defaultValue={defaults.nbFormateursDeclares} />
              </div>
              <div>
                <label className="field-label" htmlFor="nbSessionsMois">Sessions par mois</label>
                <input className="input" id="nbSessionsMois" name="nbSessionsMois" type="number" min={0} defaultValue={defaults.nbSessionsMois} />
              </div>
            </div>
          </section>

          <section style={{ display: step === 2 ? "block" : "none" }} className="onboarding-goals">
            {GOALS.map(([value, title, text, icon]) => (
              <label key={value}>
                <input type="radio" name="objectifPrincipal" value={value} defaultChecked={(defaults.objectifPrincipal || "CENTRALISER") === value} />
                <span>
                  <Icon name={icon} size={20} />
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </label>
            ))}
          </section>

          <section style={{ display: step === 3 ? "block" : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="field-label" htmlFor="starterTitle">Première formation</label>
                <input className="input" id="starterTitle" name="starterTitle" placeholder="Ex : Excel avancé pour PME" />
              </div>
              <div className="public-form-grid">
                <div>
                  <label className="field-label" htmlFor="starterTrainer">Premier formateur</label>
                  <input className="input" id="starterTrainer" name="starterTrainer" placeholder="Ex : Claire Martin" />
                </div>
                <div>
                  <label className="field-label" htmlFor="starterSessionDate">Date de première session</label>
                  <input className="input" id="starterSessionDate" name="starterSessionDate" type="date" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label" htmlFor="starterProspect">Premier prospect</label>
                  <input className="input" id="starterProspect" name="starterProspect" placeholder="Ex : Cabinet Nova RH" />
                </div>
              </div>
              <label className="onboarding-demo-option">
                <input type="checkbox" name="loadDemo" />
                <span>
                  <strong>Créer des exemples de démarrage si je laisse les champs vides</strong>
                  <small>Ils restent clairement identifiés et entièrement modifiables.</small>
                </span>
              </label>
            </div>
          </section>

          {state?.error && <div className="badge badge-danger public-form-error" style={{ marginTop: 16 }}>{state.error}</div>}

          <div className="onboarding-actions">
            {step > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>Retour</button>
            ) : (
              <Link href="/dashboard" className="btn btn-ghost">Passer pour l&apos;instant</Link>
            )}
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={() => setStep(step + 1)}>Continuer <Icon name="arrow-right" size={16} /></button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Préparation..." : "Ouvrir mon cockpit"}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
