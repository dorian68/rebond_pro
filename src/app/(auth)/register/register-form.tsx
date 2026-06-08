"use client";

import { useActionState } from "react";
import { registerAction, type ActionState } from "@/server/auth-actions";
import { Icon } from "@/components/ui/Icon";

export function RegisterForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(registerAction, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="field-label" htmlFor="centerName">Nom du centre</label>
        <input className="input" id="centerName" name="centerName" placeholder="Académie Horizon Formation" required />
      </div>
      <div>
        <label className="field-label" htmlFor="name">Votre nom</label>
        <input className="input" id="name" name="name" placeholder="Camille Rivière" required />
      </div>
      <div>
        <label className="field-label" htmlFor="email">Email professionnel</label>
        <input className="input" id="email" name="email" type="email" placeholder="vous@centre.fr" required />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Mot de passe</label>
        <input className="input" id="password" name="password" type="password" placeholder="8 caractères minimum" required minLength={8} />
      </div>
      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
        <input type="checkbox" name="terms" required style={{ marginTop: 3 }} />
        <span>J&apos;accepte les <a href="/legal/cgu" target="_blank" style={{ color: "var(--primary)", fontWeight: 700 }}>conditions d&apos;utilisation</a> et la <a href="/legal/confidentialite" target="_blank" style={{ color: "var(--primary)", fontWeight: 700 }}>politique de confidentialité</a>.</span>
      </label>
      {state?.error && (
        <div className="badge badge-danger" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>
          {state.error}
        </div>
      )}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
        {pending ? "Création…" : <>Créer mon cockpit gratuit <Icon name="arrow-right" size={17} /></>}
      </button>
    </form>
  );
}
