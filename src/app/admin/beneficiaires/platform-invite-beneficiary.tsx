"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { invitePlatformBeneficiary } from "@/server/platform-beneficiary-actions";
import type { FormActionState } from "@/server/formations-actions";
import { BILAN_PROGRAMS } from "@/lib/bilan-programs";

type Draft = { firstName?: string; lastName?: string; email?: string; phone?: string; objective?: string };

export function PlatformInviteBeneficiary() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [state, action, pending] = useActionState<FormActionState, FormData>(invitePlatformBeneficiary, undefined);
  const [formKey, setFormKey] = useState(0);

  const applyDraft = (fields: Record<string, unknown>) => {
    setDraft((cur) => ({ ...cur, ...fields }));
    setOpen(true);
    setFormKey((k) => k + 1);
  };

  return (
    <Card>
      <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 15 }}>Créer un dossier bénéficiaire</h3>
          <p className="muted-3" style={{ fontSize: 12.5, marginTop: 2 }}>Admin plateforme : crée le dossier dans le sas bilan. Le transfert vers un centre se décide plus tard.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen((v) => !v)}>
          <Icon name="plus" size={16} /> {open ? "Fermer" : "Nouveau bénéficiaire"}
        </button>
      </div>

      {open && (
        <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
          <DocumentImportPrefill target="beneficiary" onApply={applyDraft} />
          <form key={formKey} action={action} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><label className="field-label">Prénom *</label><input className="input" name="firstName" required defaultValue={draft.firstName ?? ""} /></div>
              <div><label className="field-label">Nom *</label><input className="input" name="lastName" required defaultValue={draft.lastName ?? ""} /></div>
              <div><label className="field-label">Email *</label><input className="input" type="email" name="email" required defaultValue={draft.email ?? ""} /></div>
              <div><label className="field-label">Téléphone</label><input className="input" name="phone" defaultValue={draft.phone ?? ""} /></div>
            </div>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="field-label">Accompagnement prévu *</span>
              <select className="select" name="programId" required defaultValue="adultes_projet_competences">
                {Object.values(BILAN_PROGRAMS).map((program) => (
                  <option key={program.id} value={program.id}>{program.label} — {program.audience}</option>
                ))}
              </select>
              <span className="muted-3" style={{ fontSize: 12 }}>Ce choix prépare directement le bon livret numérique et le futur PDF.</span>
            </label>
            <div><label className="field-label">Projet / objectif</label><input className="input" name="objective" defaultValue={draft.objective ?? ""} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                <Icon name="send" size={15} /> {pending ? "Création…" : "Créer le dossier"}
              </button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>Dossier créé.</span>}
              {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}
