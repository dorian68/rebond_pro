"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/server/auth-actions";
import { Icon } from "@/components/ui/Icon";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" placeholder="vous@email.com" required />
      </div>
      <div>
        <label className="field-label" htmlFor="password">Mot de passe</label>
        <input className="input" id="password" name="password" type="password" placeholder="••••••••" required />
      </div>
      {state?.error && (
        <div className="badge badge-danger" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>
          {state.error}
        </div>
      )}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
        {pending ? "Connexion…" : <>Se connecter <Icon name="arrow-right" size={17} /></>}
      </button>
    </form>
  );
}
