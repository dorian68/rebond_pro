"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/primitives";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/labels";
import { importLearnersCsv } from "@/server/learners-actions";
import type { FormActionState } from "@/server/formations-actions";
import type { LearnerListItem } from "@/server/learners";

export function LearnersExplorer({ learners, canEdit }: { learners: LearnerListItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [showImport, setShowImport] = useState(false);

  const filtered = learners.filter((l) => {
    if (!q) return true;
    const s = `${l.firstName} ${l.lastName} ${l.company ?? ""} ${l.email ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div>
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          <input className="input" placeholder="Rechercher un apprenant…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        {canEdit && <button className="btn btn-secondary" onClick={() => setShowImport(true)}><Icon name="download" size={16} /> Importer (CSV)</button>}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="tbl">
          <thead><tr><th>Apprenant</th><th>Entreprise</th><th>Dernière formation</th><th>Inscriptions</th><th>Statut</th><th>Satisfaction</th></tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/apprenants/${l.id}`)}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <Avatar size={28}>{(l.firstName[0] + l.lastName[0]).toUpperCase()}</Avatar>
                    <div>
                      <div style={{ fontWeight: 700 }}>{l.firstName} {l.lastName}</div>
                      {l.email && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{l.email}</div>}
                    </div>
                  </div>
                </td>
                <td className="muted">{l.company ?? "—"}</td>
                <td className="muted">{l.latestFormation ?? "—"}{l.latestSessionDate ? ` · ${l.latestSessionDate}` : ""}</td>
                <td className="tnum">{l.enrollmentCount}</td>
                <td>{l.latestStatus ? <span className="badge badge-neutral">{ENROLLMENT_STATUS_LABELS[l.latestStatus]}</span> : <span className="muted-3">—</span>}</td>
                <td>{l.satisfaction ? <span style={{ color: "var(--warn-strong)", fontWeight: 700 }}>{"★".repeat(l.satisfaction)}</span> : <span className="muted-3">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="muted-3" style={{ textAlign: "center", padding: 30 }}>Aucun apprenant.</p>}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); router.refresh(); }} />}
    </div>
  );
}

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [state, action, pending] = useActionState<FormActionState, FormData>(importLearnersCsv, undefined);
  if (state?.ok) { setTimeout(onDone, 100); }
  return (
    <div onClick={onClose} className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,24,35,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: 540, maxWidth: "100%", background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
        <div className="spread" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-2)" }}>
          <h3 style={{ fontSize: 17 }}>Importer des apprenants</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ color: "var(--ink-3)" }}><Icon name="x" size={18} /></button>
        </div>
        <form action={action}>
          <div style={{ padding: 22 }}>
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12 }}>Collez une ligne par apprenant au format : <code>prénom,nom,email,entreprise</code></p>
            <textarea className="input" name="csv" rows={8} placeholder={"Marie,Dupont,marie@exemple.fr,Acme\nPaul,Martin,paul@exemple.fr,PME Soleil"} required />
            {state?.error && <div className="badge badge-danger" style={{ height: "auto", padding: "8px 12px", whiteSpace: "normal", marginTop: 10 }}>{state.error}</div>}
          </div>
          <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-2)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--surface-2)" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Import…" : "Importer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
