"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { BulkEntityCreate } from "@/components/app/BulkEntityCreate";
import { PROSPECT_STAGE_LABELS, PROSPECT_TYPE_LABELS, PROSPECT_SOURCE_LABELS } from "@/lib/labels";
import { consumeDocumentIntakeDraft } from "@/lib/document-intake";
import { createProspectsBatch } from "@/server/prospects-actions";
import type { FormActionState } from "@/server/formations-actions";

type ProspectDefaults = {
  name?: string; contactName?: string | null; type?: string; email?: string | null; phone?: string | null;
  formationOfInterestId?: string | null; source?: string; stage?: string; potentialAmount?: number;
  potentialEuros?: number;
  nextAction?: string | null; nextFollowUpDate?: string | null; isHot?: boolean; notes?: string | null;
};

export function ProspectForm({
  action, formations, defaults = {}, submitLabel = "Enregistrer", cancelHref = "/prospects",
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  formations: { id: string; title: string }[];
  defaults?: ProspectDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const [bulkItems, setBulkItems] = useState<Record<string, unknown>[]>([]);
  const [draftDefaults, setDraftDefaults] = useState<ProspectDefaults>(() => {
    const imported = consumeDocumentIntakeDraft("prospect");
    return imported ? { ...defaults, ...imported.fields } : defaults;
  });
  const [formKey, setFormKey] = useState(0);

  const applyDraft = (fields: Record<string, unknown>) => {
    setDraftDefaults((cur) => ({ ...cur, ...fields }));
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <DocumentImportPrefill target="prospect" context={{ formations }} onApply={applyDraft} onApplyMany={(items) => setBulkItems(items)} />
        <BulkEntityCreate
          title="Créer plusieurs prospects"
          description="Ajoutez des lignes à la main ou validez les fiches détectées dans un document."
          fields={[
            { name: "name", label: "Nom", required: true },
            { name: "contactName", label: "Contact" },
            { name: "email", label: "Email", type: "email" },
            { name: "phone", label: "Téléphone" },
            { name: "type", label: "Type", type: "select", options: Object.entries(PROSPECT_TYPE_LABELS).map(([value, label]) => ({ value, label })) },
            { name: "source", label: "Source", type: "select", options: Object.entries(PROSPECT_SOURCE_LABELS).map(([value, label]) => ({ value, label })) },
            { name: "stage", label: "Étape", type: "select", options: Object.entries(PROSPECT_STAGE_LABELS).map(([value, label]) => ({ value, label })) },
            { name: "potentialEuros", label: "Montant potentiel", type: "number" },
            { name: "nextFollowUpDate", label: "Relance", type: "date" },
          ]}
          action={createProspectsBatch}
          items={bulkItems}
          onItemsChange={setBulkItems}
          submitLabel={`Créer ${bulkItems.length} prospect${bulkItems.length > 1 ? "s" : ""}`}
        />
      </div>
      <form key={formKey} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Prospect</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="field-label" htmlFor="name">Nom *</label><input className="input" id="name" name="name" required defaultValue={draftDefaults.name ?? ""} placeholder="Cabinet Nova RH" /></div>
          <div><label className="field-label" htmlFor="contactName">Contact</label><input className="input" id="contactName" name="contactName" defaultValue={draftDefaults.contactName ?? ""} placeholder="Léa Fontaine" /></div>
          <div>
            <label className="field-label" htmlFor="type">Type</label>
            <select className="select" id="type" name="type" defaultValue={draftDefaults.type ?? "ENTREPRISE"}>{Object.entries(PROSPECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div>
            <label className="field-label" htmlFor="source">Source</label>
            <select className="select" id="source" name="source" defaultValue={draftDefaults.source ?? "AUTRE"}>{Object.entries(PROSPECT_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label className="field-label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" defaultValue={draftDefaults.email ?? ""} /></div>
          <div><label className="field-label" htmlFor="phone">Téléphone</label><input className="input" id="phone" name="phone" defaultValue={draftDefaults.phone ?? ""} /></div>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Opportunité</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="formationOfInterestId">Formation d&apos;intérêt</label>
            <select className="select" id="formationOfInterestId" name="formationOfInterestId" defaultValue={draftDefaults.formationOfInterestId ?? ""}>
              <option value="">—</option>
              {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="stage">Étape</label>
            <select className="select" id="stage" name="stage" defaultValue={draftDefaults.stage ?? "NOUVEAU"}>{Object.entries(PROSPECT_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label className="field-label" htmlFor="potentialEuros">Montant potentiel (€)</label><input className="input" id="potentialEuros" name="potentialEuros" type="number" min={0} step="any" defaultValue={draftDefaults.potentialEuros != null ? draftDefaults.potentialEuros : draftDefaults.potentialAmount != null ? draftDefaults.potentialAmount / 100 : 0} /></div>
          <div><label className="field-label" htmlFor="nextFollowUpDate">Prochaine relance</label><input className="input" id="nextFollowUpDate" name="nextFollowUpDate" type="date" defaultValue={draftDefaults.nextFollowUpDate ?? ""} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="nextAction">Prochaine action</label><input className="input" id="nextAction" name="nextAction" defaultValue={draftDefaults.nextAction ?? ""} placeholder="Envoyer le programme détaillé" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="notes">Notes</label><textarea className="input" id="notes" name="notes" rows={3} defaultValue={draftDefaults.notes ?? ""} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
            <input type="checkbox" name="isHot" defaultChecked={draftDefaults.isHot ?? false} /> Prospect chaud 🔥
          </label>
        </div>
      </Card>

      {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}>{state.error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Link href={cancelHref} className="btn btn-secondary">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : <><Icon name="check" size={16} /> {submitLabel}</>}</button>
      </div>
      </form>
    </>
  );
}
