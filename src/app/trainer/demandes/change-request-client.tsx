"use client";

import { useState, useActionState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { createChangeRequest, cancelMyChangeRequest } from "@/server/trainer-self-actions";
import type { FormActionState } from "@/server/formations-actions";

type Req = { id: string; requestType: string; reason: string | null; status: string; urgency: string; createdAt: string; centerResponse: string | null; proposedDate: string | null };

const TYPE_LABELS: Record<string, string> = { unavailable: "Indisponibilité", partial: "Disponibilité partielle", propose_date: "Proposition de date", conflict: "Conflit", other: "Autre" };
const STATUS_STYLE: Record<string, string> = { pending: "badge-warn", accepted: "badge-positive", rejected: "badge-danger", cancelled: "badge-neutral", counter_proposed: "badge-sky" };
const STATUS_LABELS: Record<string, string> = { pending: "En attente", accepted: "Acceptée", rejected: "Refusée", cancelled: "Annulée", counter_proposed: "Contre-proposition" };

export function ChangeRequestClient({ requests, sessions }: { requests: Req[]; sessions: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(createChangeRequest, undefined);
  const [cancelling, startCancel] = useTransition();
  const [open, setOpen] = useState(requests.length === 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div className="spread" style={{ marginBottom: open ? 16 : 0 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Nouvelle demande</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => !o)}>{open ? "Réduire" : "Créer une demande"}</button>
        </div>
        {open && (
          <form action={action} style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="field-label">Type de demande</label>
                <select name="requestType" className="input" required>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Urgence</label>
                <select name="urgency" className="input" defaultValue="normal">
                  <option value="low">Faible</option><option value="normal">Normale</option><option value="high">Élevée</option>
                </select>
              </div>
            </div>
            {sessions.length > 0 && (
              <div>
                <label className="field-label">Session concernée (optionnel)</label>
                <select name="sessionId" className="input"><option value="">— Aucune / disponibilité générale —</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><label className="field-label">Date alternative proposée (optionnel)</label><input type="date" name="proposedDate" className="input" /></div>
              <div>
                <label className="field-label">Créneau proposé (optionnel)</label>
                <select name="proposedSlot" className="input"><option value="">—</option><option value="MATIN">Matin</option><option value="APRES_MIDI">Après-midi</option><option value="JOURNEE">Journée</option><option value="SOIR">Soir</option></select>
              </div>
            </div>
            <div><label className="field-label">Motif / message *</label><textarea name="reason" className="input" rows={3} required placeholder="Ex : Je ne suis finalement plus disponible le 12, je propose le 14." /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={pending}><Icon name="send" size={15} /> {pending ? "Envoi…" : "Envoyer la demande"}</button>
              {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>✓ Demande envoyée au centre</span>}
              {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Historique ({requests.length})</h3>
        {requests.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Aucune demande pour le moment.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-3)" }}>
                <div className="spread">
                  <strong style={{ fontSize: 13.5 }}>{TYPE_LABELS[r.requestType] ?? r.requestType}</strong>
                  <span className={`badge ${STATUS_STYLE[r.status] ?? "badge-neutral"}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
                </div>
                {r.reason && <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}>{r.reason}</p>}
                {r.centerResponse && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6, padding: "8px 10px", background: "#fff", borderRadius: 8 }}><strong>Réponse du centre :</strong> {r.centerResponse}</p>}
                <div className="spread" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{new Date(r.createdAt).toLocaleDateString("fr-FR")}</span>
                  {r.status === "pending" && (
                    <button className="btn btn-ghost btn-sm" disabled={cancelling} onClick={() => startCancel(() => cancelMyChangeRequest(r.id))}>Annuler</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
