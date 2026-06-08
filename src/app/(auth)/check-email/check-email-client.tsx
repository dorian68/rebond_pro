"use client";

import { useActionState } from "react";
import { resendVerificationAction, type ActionState } from "@/server/auth-actions";

export function CheckEmailClient({ email, deliveryFailed }: { email: string; deliveryFailed: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resendVerificationAction, undefined);
  return (
    <div>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>Confirmez votre email</h1>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.65 }}>
        Un lien de confirmation a été envoyé à <strong>{email}</strong>. Il expire dans 24 heures.
      </p>
      {deliveryFailed && <div className="badge badge-warn public-form-error" style={{ marginTop: 16 }}>Le premier envoi a échoué. Utilisez le bouton ci-dessous.</div>}
      {state?.ok && <div className="badge badge-positive public-form-error" style={{ marginTop: 16 }}>Un nouveau lien a été envoyé.</div>}
      {state?.error && <div className="badge badge-danger public-form-error" style={{ marginTop: 16 }}>{state.error}</div>}
      <form action={action} style={{ marginTop: 18 }}>
        <input type="hidden" name="email" value={email} />
        <button className="btn btn-secondary btn-block" disabled={pending}>{pending ? "Envoi..." : "Renvoyer l'email"}</button>
      </form>
    </div>
  );
}
