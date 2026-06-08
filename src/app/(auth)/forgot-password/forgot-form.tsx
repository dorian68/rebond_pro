"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type ActionState } from "@/server/auth-actions";
import { Icon } from "@/components/ui/Icon";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(requestPasswordResetAction, undefined);

  if (state?.ok) {
    return (
      <div className="badge badge-positive" style={{ height: "auto", padding: "12px 14px", whiteSpace: "normal", display: "block" }}>
        Si un compte existe pour cet email, un lien de réinitialisation vient d&apos;être envoyé. Pensez à vérifier vos spams.
      </div>
    );
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="field-label" htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" placeholder="vous@centre.fr" required />
      </div>
      {state?.error && (
        <div className="badge badge-danger" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>{state.error}</div>
      )}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
        {pending ? "Envoi…" : <>Envoyer le lien <Icon name="send" size={16} /></>}
      </button>
    </form>
  );
}
