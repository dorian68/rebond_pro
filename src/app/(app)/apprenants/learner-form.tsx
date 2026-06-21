"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { consumeDocumentIntakeDraft } from "@/lib/document-intake";
import type { FormActionState } from "@/server/formations-actions";

type LearnerDefaults = { firstName?: string; lastName?: string; email?: string | null; phone?: string | null; company?: string | null; sessionId?: string };

export function LearnerForm({
  action, defaults = {}, submitLabel = "Enregistrer", cancelHref = "/apprenants",
  enrollSessions, presetSessionId,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: LearnerDefaults;
  submitLabel?: string;
  cancelHref?: string;
  enrollSessions?: { id: string; label: string }[];
  presetSessionId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const [draftDefaults, setDraftDefaults] = useState<LearnerDefaults>(() => {
    const imported = consumeDocumentIntakeDraft("learner");
    return imported ? { ...defaults, ...imported.fields } : defaults;
  });
  const [formKey, setFormKey] = useState(0);

  const applyDraft = (fields: Record<string, unknown>) => {
    setDraftDefaults((cur) => ({ ...cur, ...fields }));
    setFormKey((k) => k + 1);
  };

  return (
    <form key={formKey} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <DocumentImportPrefill target="learner" context={{ sessions: enrollSessions ?? [] }} onApply={applyDraft} />
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Apprenant</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="field-label" htmlFor="firstName">Prénom *</label><input className="input" id="firstName" name="firstName" required defaultValue={draftDefaults.firstName ?? ""} /></div>
          <div><label className="field-label" htmlFor="lastName">Nom *</label><input className="input" id="lastName" name="lastName" required defaultValue={draftDefaults.lastName ?? ""} /></div>
          <div><label className="field-label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" defaultValue={draftDefaults.email ?? ""} /></div>
          <div><label className="field-label" htmlFor="phone">Téléphone</label><input className="input" id="phone" name="phone" defaultValue={draftDefaults.phone ?? ""} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="company">Entreprise</label><input className="input" id="company" name="company" defaultValue={draftDefaults.company ?? ""} /></div>
        </div>
      </Card>

      {enrollSessions && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Inscription (optionnel)</h3>
          <select className="select" name="sessionId" defaultValue={draftDefaults.sessionId ?? presetSessionId ?? ""}>
            <option value="">— Ne pas inscrire maintenant</option>
            {enrollSessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Card>
      )}

      {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}>{state.error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Link href={cancelHref} className="btn btn-secondary">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : <><Icon name="check" size={16} /> {submitLabel}</>}</button>
      </div>
    </form>
  );
}
