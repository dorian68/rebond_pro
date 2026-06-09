"use client";

import { useState, useActionState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { inviteBeneficiary } from "@/server/beneficiary-actions";
import type { FormActionState } from "@/server/formations-actions";

export function InviteBeneficiary() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormActionState, FormData>(inviteBeneficiary, undefined);

  return (
    <Card>
      <div className="spread">
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Inviter un bénéficiaire</h3>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Crée son espace personnel et initialise son parcours de bilan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={16} /> {open ? "Fermer" : "Nouveau bénéficiaire"}</button>
      </div>
      {open && (
        <form action={action} style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label className="field-label">Prénom *</label><input className="input" name="firstName" required /></div>
            <div><label className="field-label">Nom *</label><input className="input" name="lastName" required /></div>
            <div><label className="field-label">Email *</label><input className="input" type="email" name="email" required /></div>
            <div><label className="field-label">Téléphone</label><input className="input" name="phone" /></div>
          </div>
          <div><label className="field-label">Projet / objectif (optionnel)</label><input className="input" name="objective" placeholder="Reconversion, évolution…" /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={pending}><Icon name="send" size={15} /> {pending ? "Création…" : "Créer l'espace & inviter"}</button>
            {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Bénéficiaire invité</span>}
            {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
          </div>
        </form>
      )}
    </Card>
  );
}
