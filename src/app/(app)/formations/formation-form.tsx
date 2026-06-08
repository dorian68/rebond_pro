"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { MODALITY_LABELS, LEVEL_LABELS, FORMATION_STATUS_LABELS, CATEGORIES } from "@/lib/labels";
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
  modality?: string;
  level?: string;
  status?: string;
  color?: string | null;
};

const COLORS = ["#5850ec", "#2f7fc4", "#129a93", "#d9821f", "#18996b", "#dc5147"];

export function FormationForm({
  action,
  defaults = {},
  submitLabel = "Enregistrer",
  cancelHref = "/formations",
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  defaults?: FormationDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Informations générales</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="title">Titre de la formation *</label>
            <input className="input" id="title" name="title" required defaultValue={defaults.title ?? ""} placeholder="Ex : Excel Avancé pour PME" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="category">Catégorie</label>
              <select className="select" id="category" name="category" defaultValue={defaults.category ?? ""}>
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="status">Statut</label>
              <select className="select" id="status" name="status" defaultValue={defaults.status ?? "BROUILLON"}>
                {Object.entries(FORMATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="shortDescription">Description courte</label>
            <input className="input" id="shortDescription" name="shortDescription" defaultValue={defaults.shortDescription ?? ""} placeholder="Bénéfice principal en une phrase" />
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Format & tarif</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="modality">Modalité</label>
            <select className="select" id="modality" name="modality" defaultValue={defaults.modality ?? "PRESENTIEL"}>
              {Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="level">Niveau</label>
            <select className="select" id="level" name="level" defaultValue={defaults.level ?? "DEBUTANT"}>
              {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="priceEuros">Prix (€)</label>
            <input className="input" id="priceEuros" name="priceEuros" type="number" min={0} step={10} defaultValue={defaults.price != null ? defaults.price / 100 : 0} />
          </div>
          <div>
            <label className="field-label" htmlFor="durationDays">Durée (jours)</label>
            <input className="input" id="durationDays" name="durationDays" type="number" min={0} defaultValue={defaults.durationDays ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor="durationHours">Durée (heures)</label>
            <input className="input" id="durationHours" name="durationHours" type="number" min={0} defaultValue={defaults.durationHours ?? ""} />
          </div>
          <div>
            <label className="field-label">Couleur</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", height: 40 }}>
              {COLORS.map((c, i) => (
                <label key={c} style={{ cursor: "pointer" }}>
                  <input type="radio" name="color" value={c} defaultChecked={defaults.color ? defaults.color === c : i === 0} style={{ display: "none" }} />
                  <span style={{ display: "block", width: 24, height: 24, borderRadius: 7, background: c, outline: (defaults.color ? defaults.color === c : i === 0) ? "2px solid var(--ink)" : "2px solid transparent", outlineOffset: 2 }} />
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
            <textarea className="input" id="objectives" name="objectives" rows={3} defaultValue={defaults.objectives ?? ""} />
          </div>
          <div>
            <label className="field-label" htmlFor="program">Programme</label>
            <textarea className="input" id="program" name="program" rows={4} defaultValue={defaults.program ?? ""} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="targetAudience">Public cible</label>
              <textarea className="input" id="targetAudience" name="targetAudience" rows={2} defaultValue={defaults.targetAudience ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="prerequisites">Prérequis</label>
              <textarea className="input" id="prerequisites" name="prerequisites" rows={2} defaultValue={defaults.prerequisites ?? ""} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="longDescription">Description longue</label>
            <textarea className="input" id="longDescription" name="longDescription" rows={4} defaultValue={defaults.longDescription ?? ""} />
          </div>
        </div>
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
