"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { findBestSlotsAction } from "@/server/planning-actions";
import type { SlotSuggestion } from "@/server/planning";

export function BestSlotsPanel({ formations }: { formations: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [formationId, setFormationId] = useState(formations[0]?.id ?? "");
  const [results, setResults] = useState<SlotSuggestion[] | null>(null);
  const [pending, start] = useTransition();

  const search = () => start(async () => { setResults(await findBestSlotsAction(formationId)); });

  return (
    <>
      <button className="btn btn-ai" onClick={() => { setOpen(true); setResults(null); }} disabled={formations.length === 0}>
        <Icon name="wand" size={17} /> Trouver les meilleurs créneaux
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,24,35,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: 600, maxWidth: "100%", maxHeight: "88vh", background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-pop)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="spread" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-2)", background: "var(--primary-tint)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#2f9488,#2469a6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="wand" size={16} /></div>
                <h3 style={{ fontSize: 16 }}>Meilleurs créneaux</h3>
              </div>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" style={{ color: "var(--ink-3)" }}><Icon name="x" size={18} /></button>
            </div>

            <div style={{ padding: 22, overflowY: "auto" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                <select className="select" value={formationId} onChange={(e) => { setFormationId(e.target.value); setResults(null); }}>
                  {formations.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
                <button className="btn btn-primary" onClick={search} disabled={pending}>{pending ? "Analyse…" : "Analyser"}</button>
              </div>

              {results === null && !pending && <p className="muted-3" style={{ fontSize: 13 }}>Choisissez une formation et lancez l&apos;analyse. Le moteur croise les disponibilités des formateurs éligibles, les salles libres et les conflits.</p>}
              {pending && <p className="muted-3" style={{ fontSize: 13 }}>Analyse des disponibilités…</p>}
              {results && results.length === 0 && <p className="muted-3" style={{ fontSize: 13 }}>Aucun créneau compatible trouvé sur les 4 prochaines semaines. Vérifiez les formateurs éligibles et leurs disponibilités.</p>}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results?.map((s, i) => (
                  <div key={i} style={{ border: `1px solid ${s.conflict ? "var(--warn-border)" : "var(--border)"}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 14, background: s.conflict ? "var(--warn-bg)" : "var(--surface)" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: s.score >= 85 ? "var(--positive-bg)" : "var(--primary-50)", color: s.score >= 85 ? "var(--positive-600)" : "var(--primary)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <span className="tnum" style={{ fontSize: 16, fontWeight: 800 }}>{s.score}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>score</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{formatDate(s.date)}{s.date !== s.endDate ? ` → ${formatDate(s.endDate)}` : ""}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{s.trainerName} · {s.reason}</div>
                    </div>
                    <Link
                      href={`/sessions/new?formationId=${formationId}&start=${s.date}&end=${s.endDate}&trainerId=${s.trainerId}${s.roomId ? `&roomId=${s.roomId}` : ""}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Créer <Icon name="arrow-right" size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
