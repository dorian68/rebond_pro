"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { DocumentImportPrefill } from "@/components/app/DocumentImportPrefill";
import { MODALITY_LABELS, LEVEL_LABELS, FORMATION_STATUS_LABELS, CATEGORIES } from "@/lib/labels";
import { consumeDocumentIntakeDraft } from "@/lib/document-intake";
import type { FormActionState } from "@/server/formations-actions";

type FormationDefaults = {
  title?: string;
  category?: string | null;
  shortDescription?: string | null;
  longDescription?: string | null;
  objectives?: string | null;
  targetAudience?: string | null;
  prerequisites?: string | null;
  program?: string | null;
  durationDays?: number | null;
  durationHours?: number | null;
  price?: number;
  priceEuros?: number;
  modality?: string;
  level?: string;
  status?: string;
  color?: string | null;
  modules?: FormationModuleDraft[];
};

type FormationModuleDraft = {
  id?: string;
  title?: string;
  description?: string | null;
  durationDays?: number | null;
  durationHours?: number | null;
  trainerIds?: string[];
};

const COLORS = ["#2469a6", "#2f7fc4", "#129a93", "#d9821f", "#18996b", "#dc5147"];

export function FormationForm({
  action,
  defaults = {},
  submitLabel = "Enregistrer",
  cancelHref = "/formations",
  trainers = [],
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: FormationDefaults;
  submitLabel?: string;
  cancelHref?: string;
  trainers?: { id: string; firstName: string; lastName: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const [draftDefaults, setDraftDefaults] = useState<FormationDefaults>(() => {
    const imported = consumeDocumentIntakeDraft("formation");
    return imported ? { ...defaults, ...imported.fields } : defaults;
  });
  const [formKey, setFormKey] = useState(0);
  const [modules, setModules] = useState<FormationModuleDraft[]>(() => draftDefaults.modules ?? []);

  const applyDraft = (fields: Record<string, unknown>) => {
    const nextModules = Array.isArray(fields.modules) ? fields.modules.filter((m) => m && typeof m === "object") as FormationModuleDraft[] : undefined;
    setDraftDefaults((cur) => ({ ...cur, ...fields, modules: nextModules ?? cur.modules }));
    if (nextModules) setModules(nextModules);
    setFormKey((k) => k + 1);
  };

  const updateModule = (index: number, patch: Partial<FormationModuleDraft>) => {
    setModules((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const toggleModuleTrainer = (index: number, trainerId: string, checked: boolean) => {
    setModules((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      const selected = new Set(row.trainerIds ?? []);
      if (checked) selected.add(trainerId); else selected.delete(trainerId);
      return { ...row, trainerIds: Array.from(selected) };
    }));
  };

  return (
    <form key={formKey} action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input type="hidden" name="modulesJson" value={JSON.stringify(modules)} />
      <DocumentImportPrefill target="formation" onApply={applyDraft} />
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Informations générales</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="title">Titre de la formation *</label>
            <input className="input" id="title" name="title" required defaultValue={draftDefaults.title ?? ""} placeholder="Ex : Excel Avancé pour PME" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="category">Catégorie</label>
              <select className="select" id="category" name="category" defaultValue={draftDefaults.category ?? ""}>
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="status">Statut</label>
              <select className="select" id="status" name="status" defaultValue={draftDefaults.status ?? "BROUILLON"}>
                {Object.entries(FORMATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="shortDescription">Description courte</label>
            <input className="input" id="shortDescription" name="shortDescription" defaultValue={draftDefaults.shortDescription ?? ""} placeholder="Bénéfice principal en une phrase" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Format & tarif</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="modality">Modalité</label>
            <select className="select" id="modality" name="modality" defaultValue={draftDefaults.modality ?? "PRESENTIEL"}>
              {Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="level">Niveau</label>
            <select className="select" id="level" name="level" defaultValue={draftDefaults.level ?? "DEBUTANT"}>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="priceEuros">Prix (€)</label>
            <input className="input" id="priceEuros" name="priceEuros" type="number" min={0} step={10} defaultValue={draftDefaults.priceEuros != null ? draftDefaults.priceEuros : draftDefaults.price != null ? draftDefaults.price / 100 : 0} />
          </div>
          <div>
            <label className="field-label" htmlFor="durationDays">Durée (jours)</label>
            <input className="input" id="durationDays" name="durationDays" type="number" min={0} defaultValue={draftDefaults.durationDays ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor="durationHours">Durée (heures)</label>
            <input className="input" id="durationHours" name="durationHours" type="number" min={0} defaultValue={draftDefaults.durationHours ?? ""} />
          </div>
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
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Contenu pédagogique</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="objectives">Objectifs pédagogiques</label>
            <textarea className="input" id="objectives" name="objectives" rows={3} defaultValue={draftDefaults.objectives ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor="program">Programme</label>
            <textarea className="input" id="program" name="program" rows={4} defaultValue={draftDefaults.program ?? ""} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="targetAudience">Public cible</label>
              <textarea className="input" id="targetAudience" name="targetAudience" rows={2} defaultValue={draftDefaults.targetAudience ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="prerequisites">Prérequis</label>
              <textarea className="input" id="prerequisites" name="prerequisites" rows={2} defaultValue={draftDefaults.prerequisites ?? ""} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="longDescription">Description longue</label>
            <textarea className="input" id="longDescription" name="longDescription" rows={4} defaultValue={draftDefaults.longDescription ?? ""} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="spread" style={{ gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Modules de formation</h3>
            <p className="muted-3" style={{ fontSize: 12.5 }}>Découpez la formation en modules et indiquez les formateurs capables d&apos;animer chaque partie.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModules((rows) => [...rows, { title: "", description: "", durationDays: null, durationHours: null, trainerIds: [] }])}>
            <Icon name="plus" size={15} /> Module
          </button>
        </div>
        {modules.length === 0 ? (
          <p className="muted-3" style={{ fontSize: 13 }}>Aucun module détaillé. L&apos;ancienne logique formateurs éligibles reste utilisée.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {modules.map((module, index) => {
              const selectedTrainerIds = new Set(module.trainerIds ?? []);
              return (
                <div key={index} className="card" style={{ padding: 12, background: "var(--surface-2)" }}>
                  <div className="spread" style={{ gap: 10, marginBottom: 10 }}>
                    <strong style={{ fontSize: 13 }}>Module {index + 1}</strong>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModules((rows) => rows.filter((_, i) => i !== index))}>
                      <Icon name="x" size={14} /> Retirer
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px", gap: 10 }}>
                    <label style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                      Titre *
                      <input className="input" value={module.title ?? ""} onChange={(e) => updateModule(index, { title: e.target.value })} placeholder="Ex : Fondamentaux" />
                    </label>
                    <label style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                      Jours
                      <input className="input" type="number" min={0} value={module.durationDays ?? ""} onChange={(e) => updateModule(index, { durationDays: e.target.value === "" ? null : Number(e.target.value) })} />
                    </label>
                    <label style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700 }}>
                      Heures
                      <input className="input" type="number" min={0} value={module.durationHours ?? ""} onChange={(e) => updateModule(index, { durationHours: e.target.value === "" ? null : Number(e.target.value) })} />
                    </label>
                  </div>
                  <label style={{ display: "grid", gap: 5, fontSize: 12.5, fontWeight: 700, marginTop: 10 }}>
                    Description
                    <textarea className="input" rows={2} value={module.description ?? ""} onChange={(e) => updateModule(index, { description: e.target.value })} />
                  </label>
                  {trainers.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div className="field-label">Formateurs possibles pour ce module</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                        {trainers.map((trainer) => (
                          <label key={trainer.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "7px 9px", borderRadius: 8, background: "var(--surface-3)" }}>
                            <input type="checkbox" checked={selectedTrainerIds.has(trainer.id)} onChange={(e) => toggleModuleTrainer(index, trainer.id, e.target.checked)} />
                            {trainer.firstName} {trainer.lastName}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {state?.error && (
        <div className="badge badge-danger" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}>{state.error}</div>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Link href={cancelHref} className="btn btn-secondary">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : <><Icon name="check" size={16} /> {submitLabel}</>}
        </button>
      </div>
    </form>
  );
}
