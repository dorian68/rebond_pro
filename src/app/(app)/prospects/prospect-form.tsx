"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { PROSPECT_STAGE_LABELS, PROSPECT_TYPE_LABELS, PROSPECT_SOURCE_LABELS } from "@/lib/labels";
import type { FormActionState } from "@/server/formations-actions";

type ProspectDefaults = {
  name?: string; contactName?: string | null; type?: string; email?: string | null; phone?: string | null;
  formationOfInterestId?: string | null; source?: string; stage?: string; potentialAmount?: number;
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

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Prospect</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="field-label" htmlFor="name">Nom *</label><input className="input" id="name" name="name" required defaultValue={defaults.name ?? ""} placeholder="Cabinet Nova RH" /></div>
          <div><label className="field-label" htmlFor="contactName">Contact</label><input className="input" id="contactName" name="contactName" defaultValue={defaults.contactName ?? ""} placeholder="Léa Fontaine" /></div>
          <div>
            <label className="field-label" htmlFor="type">Type</label>
            <select className="select" id="type" name="type" defaultValue={defaults.type ?? "ENTREPRISE"}>{Object.entries(PROSPECT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div>
            <label className="field-label" htmlFor="source">Source</label>
            <select className="select" id="source" name="source" defaultValue={defaults.source ?? "AUTRE"}>{Object.entries(PROSPECT_SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label className="field-label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" defaultValue={defaults.email ?? ""} /></div>
          <div><label className="field-label" htmlFor="phone">Téléphone</label><input className="input" id="phone" name="phone" defaultValue={defaults.phone ?? ""} /></div>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Opportunité</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="formationOfInterestId">Formation d&apos;intérêt</label>
            <select className="select" id="formationOfInterestId" name="formationOfInterestId" defaultValue={defaults.formationOfInterestId ?? ""}>
              <option value="">—</option>
              {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="stage">Étape</label>
            <select className="select" id="stage" name="stage" defaultValue={defaults.stage ?? "NOUVEAU"}>{Object.entries(PROSPECT_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </div>
          <div><label className="field-label" htmlFor="potentialEuros">Montant potentiel (€)</label><input className="input" id="potentialEuros" name="potentialEuros" type="number" min={0} step={10} defaultValue={defaults.potentialAmount != null ? defaults.potentialAmount / 100 : 0} /></div>
          <div><label className="field-label" htmlFor="nextFollowUpDate">Prochaine relance</label><input className="input" id="nextFollowUpDate" name="nextFollowUpDate" type="date" defaultValue={defaults.nextFollowUpDate ?? ""} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="nextAction">Prochaine action</label><input className="input" id="nextAction" name="nextAction" defaultValue={defaults.nextAction ?? ""} placeholder="Envoyer le programme détaillé" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="notes">Notes</label><textarea className="input" id="notes" name="notes" rows={3} defaultValue={defaults.notes ?? ""} /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
            <input type="checkbox" name="isHot" defaultChecked={defaults.isHot ?? false} /> Prospect chaud 🔥
          </label>
        </div>
      </Card>

      {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}>{state.error}</div>}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Link href={cancelHref} className="btn btn-secondary">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Enregistrement…" : <><Icon name="check" size={16} /> {submitLabel}</>}</button>
      </div>
    </form>
  );
}
