"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SessionBadge, FillBar, Avatar } from "@/components/ui/primitives";
import { formatDateRange, formatMoney } from "@/lib/utils";
import type { SessionListItem } from "@/server/sessions";

const STATUS_FILTERS = [
  { key: "", label: "Toutes" },
  { key: "upcoming", label: "À venir" },
  { key: "RISQUE", label: "À risque" },
  { key: "COMPLETE", label: "Complètes" },
  { key: "TERMINEE", label: "Terminées" },
];

export function SessionsExplorer({ sessions }: { sessions: SessionListItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [view, setView] = useState<"list" | "formation" | "trainer">("list");

  const filtered = sessions.filter((s) => {
    if (!filter) return true;
    if (filter === "upcoming") return s.isUpcoming;
    if (filter === "RISQUE") return s.uiStatus === "RISQUE";
    return s.uiStatus === filter || s.status === filter;
  });

  const groups = new Map<string, SessionListItem[]>();
  if (view !== "list") {
    for (const s of filtered) {
      const key = view === "formation" ? s.formation.title : s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}` : "Non assigné";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
  }

  const Row = ({ s }: { s: SessionListItem }) => (
    <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/sessions/${s.id}`)}>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 4, height: 30, borderRadius: 4, background: s.formation.color ?? "#2469a6", flex: "none" }} />
          <div>
            <div style={{ fontWeight: 700 }}>{s.formation.title}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{formatDateRange(s.startDate, s.endDate)}</div>
          </div>
        </div>
      </td>
      <td>
        {s.trainer ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar size={26} color={s.trainer.color ?? undefined}>{s.trainer.initials ?? (s.trainer.firstName[0] + s.trainer.lastName[0])}</Avatar>
            <span style={{ fontSize: 13 }}>{s.trainer.firstName} {s.trainer.lastName}</span>
            {!s.trainerConfirmed && <span title="Non confirmé" style={{ color: "var(--warn-strong)" }}><Icon name="alert-circle" size={14} /></span>}
          </div>
        ) : <span style={{ color: "var(--warn-strong)", fontSize: 13, fontWeight: 600 }}>Non assigné</span>}
      </td>
      <td><span className="tnum" style={{ fontSize: 13 }}>{s.enrolled}/{s.capacity}</span></td>
      <td><FillBar value={s.fillRate} seuil={s.capacity > 0 ? Math.round((s.breakEvenSeats / s.capacity) * 100) : undefined} width={100} /></td>
      <td className="tnum muted" style={{ fontSize: 13 }}>{formatMoney(s.forecast)}</td>
      <td><SessionBadge statut={s.uiStatus} /></td>
    </tr>
  );

  return (
    <div>
      <div className="card" style={{ padding: 12, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STATUS_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={"btn btn-sm " + (filter === f.key ? "btn-primary" : "btn-ghost")}>{f.label}</button>
          ))}
        </div>
        <select className="select" value={view} onChange={(e) => setView(e.target.value as typeof view)} style={{ width: "auto" }}>
          <option value="list">Vue liste</option>
          <option value="formation">Par formation</option>
          <option value="trainer">Par formateur</option>
        </select>
      </div>

      {view === "list" ? (
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="tbl">
            <thead><tr><th>Formation</th><th>Formateur</th><th>Inscrits</th><th>Remplissage</th><th>CA prév.</th><th>Statut</th></tr></thead>
            <tbody>{filtered.map((s) => <Row key={s.id} s={s} />)}</tbody>
          </table>
          {filtered.length === 0 && <p className="muted-3" style={{ textAlign: "center", padding: 30 }}>Aucune session.</p>}
        </div>
      ) : (
        [...groups.entries()].map(([group, items]) => (
          <div key={group} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink-2)", margin: "4px 4px 8px" }}>{group} <span className="muted-3">({items.length})</span></div>
            <div className="card" style={{ overflow: "hidden" }}>
              <table className="tbl">
                <thead><tr><th>Formation</th><th>Formateur</th><th>Inscrits</th><th>Remplissage</th><th>CA prév.</th><th>Statut</th></tr></thead>
                <tbody>{items.map((s) => <Row key={s.id} s={s} />)}</tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
