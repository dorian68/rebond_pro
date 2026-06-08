"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/server/auth-actions";
import { Icon } from "@/components/ui/Icon";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPasswordAction, undefined);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="token" value={token} />
      <div>
        <label className="field-label" htmlFor="password">Nouveau mot de passe</label>
        <input className="input" id="password" name="password" type="password" placeholder="8 caractères minimum" required minLength={8} />
      </div>
      {state?.error && (
        <div className="badge badge-danger" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal" }}>{state.error}</div>
      )}
      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : <>Réinitialiser <Icon name="check" size={16} /></>}
      </button>
    </form>
  );
}
