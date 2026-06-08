"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/primitives";
import { SESSION_STATUS_LABELS, SLOT_LABELS } from "@/lib/labels";
import type { FormActionState } from "@/server/formations-actions";

type SessionDefaults = {
  formationId?: string;
  trainerId?: string | null;
  roomId?: string | null;
  startDate?: string;
  endDate?: string;
  slots?: string[];
  capacity?: number;
  price?: number;
  breakEvenSeats?: number;
  status?: string;
  trainerConfirmed?: boolean;
};

const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"];

export function SessionForm({
  action,
  formations,
  trainers,
  rooms,
  defaults = {},
  submitLabel = "Créer la session",
  cancelHref = "/sessions",
}: {
  action: (prev: FormActionState, formData: FormData) => Promise<FormActionState>;
  formations: { id: string; title: string; price: number }[];
  trainers: { id: string; firstName: string; lastName: string }[];
  rooms: { id: string; name: string; type: string }[];
  defaults?: SessionDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(action, undefined);
  const [formationId, setFormationId] = useState(defaults.formationId ?? formations[0]?.id ?? "");
  const [price, setPrice] = useState<number>(defaults.price != null ? defaults.price / 100 : (formations.find((f) => f.id === (defaults.formationId ?? formations[0]?.id))?.price ?? 0) / 100);

  const onFormationChange = (id: string) => {
    setFormationId(id);
    const f = formations.find((x) => x.id === id);
    if (f && defaults.price == null) setPrice(f.price / 100);
  };

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Session</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="formationId">Formation *</label>
            <select className="select" id="formationId" name="formationId" required value={formationId} onChange={(e) => onFormationChange(e.target.value)}>
              {formations.length === 0 && <option value="">Aucune formation — créez-en une d&apos;abord</option>}
              {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="field-label" htmlFor="startDate">Date de début *</label>
              <input className="input" id="startDate" name="startDate" type="date" required defaultValue={defaults.startDate ?? ""} />
            </div>
            <div>
              <label className="field-label" htmlFor="endDate">Date de fin *</label>
              <input className="input" id="endDate" name="endDate" type="date" required defaultValue={defaults.endDate ?? ""} />
            </div>
          </div>
          <div>
            <label className="field-label">Créneaux</label>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {SLOTS.map((s) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
                  <input type="checkbox" name={`slot_${s}`} defaultChecked={defaults.slots ? defaults.slots.includes(s) : s === "JOURNEE"} />
                  {SLOT_LABELS[s]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Affectation & capacité</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="field-label" htmlFor="trainerId">Formateur</label>
            <select className="select" id="trainerId" name="trainerId" defaultValue={defaults.trainerId ?? ""}>
              <option value="">— Non assigné</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="roomId">Salle / Visio</label>
            <select className="select" id="roomId" name="roomId" defaultValue={defaults.roomId ?? ""}>
              <option value="">— Aucune</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} {r.type === "VISIO" ? "(visio)" : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="capacity">Capacité maximale *</label>
            <input className="input" id="capacity" name="capacity" type="number" min={1} required defaultValue={defaults.capacity ?? 12} />
          </div>
          <div>
            <label className="field-label" htmlFor="breakEvenSeats">Seuil de rentabilité (inscrits)</label>
            <input className="input" id="breakEvenSeats" name="breakEvenSeats" type="number" min={0} defaultValue={defaults.breakEvenSeats ?? 6} />
          </div>
          <div>
            <label className="field-label" htmlFor="priceEuros">Prix par apprenant (€)</label>
            <input className="input" id="priceEuros" name="priceEuros" type="number" min={0} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label" htmlFor="status">Statut</label>
            <select className="select" id="status" name="status" defaultValue={defaults.status ?? "OUVERTE"}>
              {Object.entries(SESSION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)", marginTop: 14 }}>
          <input type="checkbox" name="trainerConfirmed" defaultChecked={defaults.trainerConfirmed ?? false} />
          Formateur confirmé
        </label>
      </Card>

      {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "10px 14px", whiteSpace: "normal" }}>{state.error}</div>}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Link href={cancelHref} className="btn btn-secondary">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={pending || formations.length === 0}>
          {pending ? "Enregistrement…" : <><Icon name="check" size={16} /> {submitLabel}</>}
        </button>
      </div>
    </form>
  );
}
