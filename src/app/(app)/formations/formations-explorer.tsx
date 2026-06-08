"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { FillBar } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/utils";
import { MODALITY_LABELS, LEVEL_LABELS, FORMATION_STATUS_LABELS, FORMATION_STATUS_BADGE } from "@/lib/labels";
import type { FormationListItem } from "@/server/formations";

export function FormationsExplorer({ formations }: { formations: FormationListItem[] }) {
  const [q, setQ] = useState("");
  const [modality, setModality] = useState("");
  const [status, setStatus] = useState("");

  const categories = useMemo(() => [...new Set(formations.map((f) => f.category).filter(Boolean))] as string[], [formations]);
  const [category, setCategory] = useState("");

  const filtered = formations.filter((f) => {
    if (q && !f.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (modality && f.modality !== modality) return false;
    if (status && f.status !== status) return false;
    if (category && f.category !== category) return false;
    return true;
  });

  return (
    <div>
      {/* Filtres */}
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)" }} />
          <input className="input" placeholder="Rechercher une formation…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 36 }} />
        </div>
        <select className="select" value={modality} onChange={(e) => setModality(e.target.value)} style={{ width: "auto", minWidth: 140 }}>
          <option value="">Toutes modalités</option>
          {Object.entries(MODALITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {categories.length > 0 && (
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "auto", minWidth: 150 }}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto", minWidth: 130 }}>
          <option value="">Tous statuts</option>
          {Object.entries(FORMATION_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Grille */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
        {filtered.map((f) => (
          <Link key={f.id} href={`/formations/${f.id}`} className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", transition: "box-shadow .15s, transform .12s" }}>
            <div style={{ height: 5, background: f.color }} />
            <div style={{ padding: 18, display: "flex", flexDirection: "column", flex: 1 }}>
              <div className="spread" style={{ marginBottom: 8, gap: 8, alignItems: "flex-start" }}>
                <span className={"badge " + (FORMATION_STATUS_BADGE[f.status] ?? "badge-neutral")}>{FORMATION_STATUS_LABELS[f.status]}</span>
                {f.isPublic && <span className="badge badge-sky"><Icon name="globe" size={12} /> Publique</span>}
              </div>
              <h3 style={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>{f.title}</h3>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14 }}>
                {f.category ?? "Sans catégorie"} · {MODALITY_LABELS[f.modality]} · {LEVEL_LABELS[f.level]}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Prix</div>
                  <div className="tnum" style={{ fontSize: 15, fontWeight: 800 }}>{formatMoney(f.price)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Durée</div>
                  <div className="tnum" style={{ fontSize: 15, fontWeight: 800 }}>{f.durationDays ? `${f.durationDays} j` : f.durationHours ? `${f.durationHours} h` : "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Sessions</div>
                  <div className="tnum" style={{ fontSize: 15, fontWeight: 800 }}>{f.upcomingSessions}</div>
                </div>
              </div>

              <div style={{ marginTop: "auto" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>Remplissage moyen (à venir)</div>
                {f.upcomingSessions > 0 ? <FillBar value={f.avgFill} width={150} /> : <span className="muted-3" style={{ fontSize: 12.5 }}>Aucune session à venir</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <p className="muted-3" style={{ textAlign: "center", padding: 40 }}>Aucune formation ne correspond à ces filtres.</p>}
    </div>
  );
}
