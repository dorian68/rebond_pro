"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Avatar } from "@/components/public/Avatar";
import { respondToChangeRequest } from "@/server/change-requests-actions";

type Req = {
  id: string; requestType: string; reason: string | null; status: string; urgency: string;
  createdAt: string; centerResponse: string | null; proposedDate: string | null; proposedSlot: string | null;
  trainer: { id: string; name: string; initials: string | null; color: string | null; photoUrl: string | null };
};

const TYPE_LABELS: Record<string, string> = { unavailable: "Indisponibilité", partial: "Disponibilité partielle", propose_date: "Proposition de date", conflict: "Conflit", other: "Autre" };
const STATUS_STYLE: Record<string, string> = { pending: "badge-warn", accepted: "badge-positive", rejected: "badge-danger", cancelled: "badge-neutral", counter_proposed: "badge-sky" };
const STATUS_LABELS: Record<string, string> = { pending: "En attente", accepted: "Acceptée", rejected: "Refusée", cancelled: "Annulée", counter_proposed: "Contre-proposition" };
const URGENCY: Record<string, { label: string; cls: string }> = { high: { label: "Urgent", cls: "badge-danger" }, normal: { label: "Normal", cls: "badge-neutral" }, low: { label: "Faible", cls: "badge-neutral" } };

export function DemandesClient({ requests, canRespond }: { requests: Req[]; canRespond: boolean }) {
  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>À traiter ({pending.length})</h3>
        {pending.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Aucune demande en attente. 🎉</p> : (
          <div style={{ display: "grid", gap: 12 }}>{pending.map((r) => <RequestRow key={r.id} r={r} canRespond={canRespond} />)}</div>
        )}
      </Card>

      {others.length > 0 && (
        <Card>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Historique</h3>
          <div style={{ display: "grid", gap: 12 }}>{others.map((r) => <RequestRow key={r.id} r={r} canRespond={false} />)}</div>
        </Card>
      )}
    </div>
  );
}

function RequestRow({ r, canRespond }: { r: Req; canRespond: boolean }) {
  const [busy, start] = useTransition();
  const [showCounter, setShowCounter] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div style={{ padding: 16, borderRadius: 14, border: "1px solid var(--border)", background: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar name={r.trainer.name} photoUrl={r.trainer.photoUrl} initials={r.trainer.initials} color={r.trainer.color} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="spread">
            <strong style={{ fontSize: 14 }}>{r.trainer.name}</strong>
            <span style={{ display: "flex", gap: 6 }}>
              {r.urgency === "high" && <span className={`badge ${URGENCY.high.cls}`}>{URGENCY.high.label}</span>}
              <span className={`badge ${STATUS_STYLE[r.status] ?? "badge-neutral"}`}>{STATUS_LABELS[r.status] ?? r.status}</span>
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
            {TYPE_LABELS[r.requestType] ?? r.requestType}
            {r.proposedDate && ` · propose le ${new Date(r.proposedDate).toLocaleDateString("fr-FR")}`}
            {r.proposedSlot && ` (${r.proposedSlot})`}
          </div>
          {r.reason && <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>{r.reason}</p>}
          {r.centerResponse && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6, padding: "8px 10px", background: "var(--surface-3)", borderRadius: 8 }}><strong>Votre réponse :</strong> {r.centerResponse}</p>}

          {canRespond && (
            <div style={{ marginTop: 12 }}>
              {showCounter && (
                <textarea className="input" rows={2} placeholder="Message au formateur (optionnel)…" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 8 }} />
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => start(() => respondToChangeRequest(r.id, "accept", note || undefined))}>Accepter</button>
                <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => start(() => respondToChangeRequest(r.id, "reject", note || undefined))}>Refuser</button>
                <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => { if (!showCounter) { setShowCounter(true); return; } start(() => respondToChangeRequest(r.id, "counter", note || undefined)); }}>
                  {showCounter ? "Envoyer la contre-proposition" : "Répondre / contre-proposer"}
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 8 }}>{new Date(r.createdAt).toLocaleDateString("fr-FR")}</div>
        </div>
      </div>
    </div>
  );
}
