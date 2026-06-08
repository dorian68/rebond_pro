"use client";

import { useActionState } from "react";
import { submitPublicLead, type PublicLeadState } from "@/server/public-actions";

export function PublicLeadForm({ orgSlug, publicSlug }: { orgSlug: string; publicSlug: string }) {
  const action = submitPublicLead.bind(null, orgSlug, publicSlug);
  const [state, formAction, pending] = useActionState<PublicLeadState, FormData>(action, undefined);

  if (state?.ok) {
    return (
      <div className="public-success">
        <strong>Demande transmise.</strong>
        <span>Le centre de formation dispose maintenant de vos coordonnées et vous recontactera.</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="public-lead-form">
      <div className="public-form-grid">
        <div>
          <label className="field-label" htmlFor="contactName">Nom et prénom *</label>
          <input className="input" id="contactName" name="contactName" required />
        </div>
        <div>
          <label className="field-label" htmlFor="company">Entreprise</label>
          <input className="input" id="company" name="company" />
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">Téléphone</label>
          <input className="input" id="phone" name="phone" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="message">Votre besoin</label>
        <textarea className="input" id="message" name="message" rows={3} placeholder="Contexte, nombre de participants, délai souhaité..." />
      </div>
      <div style={{ position: "absolute", left: "-10000px" }} aria-hidden="true">
        <label htmlFor="website">Site web</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state?.error && <div className="badge badge-danger public-form-error">{state.error}</div>}
      <div className="public-form-actions">
        <button className="btn btn-primary" name="intent" value="INSCRIPTION" disabled={pending}>
          {pending ? "Envoi..." : "Demander une inscription"}
        </button>
        <button className="btn btn-secondary" name="intent" value="RAPPEL" disabled={pending}>
          Être rappelé
        </button>
      </div>
      <p className="public-consent">Vos coordonnées servent uniquement à traiter cette demande. <a href="/legal/confidentialite" target="_blank" style={{ color: "var(--primary)", fontWeight: 700 }}>Confidentialité</a></p>
    </form>
  );
}
