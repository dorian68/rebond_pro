"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { updateMyBeneficiaryProfile } from "@/server/beneficiary-self-actions";
import type { FormActionState } from "@/server/formations-actions";

type Defaults = { firstName: string; lastName: string; phone: string | null; objective: string | null; situation: string | null };

export function BeneficiaryProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(updateMyBeneficiaryProfile, undefined);
  return (
    <Card>
      <form action={action} style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div><label className="field-label">Prénom *</label><input className="input" name="firstName" required defaultValue={defaults.firstName} /></div>
          <div><label className="field-label">Nom *</label><input className="input" name="lastName" required defaultValue={defaults.lastName} /></div>
          <div><label className="field-label">Téléphone</label><input className="input" name="phone" defaultValue={defaults.phone ?? ""} /></div>
        </div>
        <div><label className="field-label">Ma situation actuelle</label><textarea className="input" name="situation" rows={2} defaultValue={defaults.situation ?? ""} placeholder="Ex : En poste, en recherche, en reconversion…" /></div>
        <div><label className="field-label">Mon projet / objectif</label><textarea className="input" name="objective" rows={3} defaultValue={defaults.objective ?? ""} placeholder="Ce que je souhaite construire grâce à ce bilan…" /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={pending}><Icon name="check" size={16} /> {pending ? "Enregistrement…" : "Enregistrer"}</button>
          {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Enregistré</span>}
          {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
        </div>
      </form>
    </Card>
  );
}
