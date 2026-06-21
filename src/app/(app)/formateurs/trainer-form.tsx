"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/app/ImageUpload";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { consumeDocumentIntakeDraft } from "@/lib/document-intake";
import type { FormActionState } from "@/server/formations-actions";

const COLORS = ["#2469a6", "#2f7fc4", "#129a93", "#d9821f", "#18996b", "#dc5147"];

type TrainerDefaults = {
  firstName?: string; lastName?: string; email?: string | null; phone?: string | null;
  specialities?: string[]; bio?: string | null; color?: string | null; active?: boolean; formationIds?: string[];
  yearsExperience?: number | null; photoUrl?: string | null;
};

export function TrainerForm({
  action, formations, defaults = {}, submitLabel = "Enregistrer", cancelHref = "/formateurs", trainerId,
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  formations: { id: string; title: string }[];
  defaults?: TrainerDefaults;
  submitLabel?: string;
  cancelHref?: string;
  trainerId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const [draftDefaults, setDraftDefaults] = useState<TrainerDefaults>(() => {
    const imported = consumeDocumentIntakeDraft("trainer");
    return imported ? { ...defaults, ...imported.fields } : defaults;
  });
  const [formKey, setFormKey] = useState(0);
  const selected = new Set(draftDefaults.formationIds ?? []);

  const applyDraft = (fields: Record<string, unknown>) => {
    setDraftDefaults((cur) => ({ ...cur, ...fields }));
    setFormKey((k) => k + 1);
  };

  return (
    <form key={formKey} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <DocumentImportPrefill target="trainer" context={{ formations }} onApply={applyDraft} />
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Identité</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="field-label" htmlFor="firstName">Prénom *</label><input className="input" id="firstName" name="firstName" required defaultValue={draftDefaults.firstName ?? ""} /></div>
          <div><label className="field-label" htmlFor="lastName">Nom *</label><input className="input" id="lastName" name="lastName" required defaultValue={draftDefaults.lastName ?? ""} /></div>
          <div><label className="field-label" htmlFor="email">Email</label><input className="input" id="email" name="email" type="email" defaultValue={draftDefaults.email ?? ""} /></div>
          <div><label className="field-label" htmlFor="phone">Téléphone</label><input className="input" id="phone" name="phone" defaultValue={draftDefaults.phone ?? ""} /></div>
          <div><label className="field-label" htmlFor="specialities">Spécialités (séparées par virgule)</label><input className="input" id="specialities" name="specialities" placeholder="Excel, Power BI" defaultValue={(draftDefaults.specialities ?? []).join(", ")} /></div>
          <div><label className="field-label" htmlFor="yearsExperience">Années d&apos;expérience</label><input className="input" id="yearsExperience" name="yearsExperience" type="number" min={0} placeholder="ex : 10" defaultValue={draftDefaults.yearsExperience ?? ""} /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="field-label" htmlFor="bio">Bio (visible sur le profil public)</label><textarea className="input" id="bio" name="bio" rows={3} defaultValue={draftDefaults.bio ?? ""} /></div>
          <div>
            <label className="field-label">Couleur</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", height: 40 }}>
              {COLORS.map((c, i) => (
                <label key={c} style={{ cursor: "pointer" }}>
                  <input type="radio" name="color" value={c} defaultChecked={draftDefaults.color ? draftDefaults.color === c : i === 0} style={{ display: "none" }} />
                  <span style={{ display: "block", width: 24, height: 24, borderRadius: 7, background: c, outline: (draftDefaults.color ? draftDefaults.color === c : i === 0) ? "2px solid var(--ink)" : "2px solid transparent", outlineOffset: 2 }} />
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
              <input type="checkbox" name="active" defaultChecked={draftDefaults.active ?? true} /> Actif
            </label>
          </div>
        </div>
      </Card>

      {trainerId && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Photo de profil</h3>
          <p className="muted-3" style={{ fontSize: 12.5, marginBottom: 14 }}>Affichée sur le profil public du formateur dans la marketplace.</p>
          <ImageUpload kind="trainer_photo" trainerId={trainerId} currentUrl={draftDefaults.photoUrl} label="Photo du formateur" shape="circle" />
        </Card>
      )}

      {formations.length > 0 && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>Formations animées</h3>
          <p className="muted-3" style={{ fontSize: 12.5, marginBottom: 14 }}>Sélectionnez les formations que ce formateur peut animer.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {formations.map((f) => (
              <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "8px 10px", borderRadius: 9, background: "var(--surface-3)" }}>
                <input type="checkbox" name="formationIds" value={f.id} defaultChecked={selected.has(f.id)} /> {f.title}
              </label>
            ))}
          </div>
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
