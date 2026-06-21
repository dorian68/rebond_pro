"use client";

import { useState, useActionState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { consumeDocumentIntakeDraft } from "@/lib/document-intake";
import { inviteBeneficiary } from "@/server/beneficiary-actions";
import type { FormActionState } from "@/server/formations-actions";

type BeneficiaryDraft = { firstName?: string; lastName?: string; email?: string; phone?: string; objective?: string };

export function InviteBeneficiary() {
  const [draft, setDraft] = useState<BeneficiaryDraft>(() => {
    const imported = consumeDocumentIntakeDraft("beneficiary");
    return imported ? { ...imported.fields } : {};
  });
  const [open, setOpen] = useState(() => Object.keys(draft).length > 0);
  const [state, action, pending] = useActionState<FormActionState, FormData>(inviteBeneficiary, undefined);
  const [formKey, setFormKey] = useState(0);

  const applyDraft = (fields: Record<string, unknown>) => {
    setDraft((cur) => ({ ...cur, ...fields }));
    setOpen(true);
    setFormKey((k) => k + 1);
  };

  return (
    <Card>
      <div className="spread">
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Inviter un bénéficiaire</h3>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>Crée son espace personnel et initialise son parcours de bilan.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}><Icon name="plus" size={16} /> {open ? "Fermer" : "Nouveau bénéficiaire"}</button>
      </div>
      {!open && (
        <div style={{ marginTop: 16 }}>
          <DocumentImportPrefill target="beneficiary" onApply={applyDraft} />
        </div>
      )}
      {open && (
        <form key={formKey} action={action} style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <DocumentImportPrefill target="beneficiary" onApply={applyDraft} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><label className="field-label">Prénom *</label><input className="input" name="firstName" required defaultValue={draft.firstName ?? ""} /></div>
            <div><label className="field-label">Nom *</label><input className="input" name="lastName" required defaultValue={draft.lastName ?? ""} /></div>
            <div><label className="field-label">Email *</label><input className="input" type="email" name="email" required defaultValue={draft.email ?? ""} /></div>
            <div><label className="field-label">Téléphone</label><input className="input" name="phone" defaultValue={draft.phone ?? ""} /></div>
          </div>
          <div><label className="field-label">Projet / objectif (optionnel)</label><input className="input" name="objective" placeholder="Reconversion, évolution…" defaultValue={draft.objective ?? ""} /></div>
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
