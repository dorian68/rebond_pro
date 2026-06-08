"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { setMyAvailability, clearMyAvailability, bulkSetAvailability } from "@/server/trainer-self-actions";

const SLOTS = [
  { id: "MATIN", label: "Matin" },
  { id: "APRES_MIDI", label: "Après-midi" },
  { id: "JOURNEE", label: "Journée" },
  { id: "SOIR", label: "Soir" },
];

// Cycle d'états au clic : vide → disponible → sous réserve → indisponible → vide
const CYCLE: (string | null)[] = ["DISPONIBLE", "TENTATIVE", "INDISPONIBLE", null];
const STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  DISPONIBLE: { bg: "#e7f7ee", fg: "#137a45", label: "Disponible" },
  TENTATIVE: { bg: "#fff4e0", fg: "#a86617", label: "Sous réserve" },
  INDISPONIBLE: { bg: "#fde8e8", fg: "#b42424", label: "Indisponible" },
};

function fmtDay(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

export function AvailabilityEditor({ initial }: { initial: { key: string; type: string }[] }) {
  const [map, setMap] = useState<Record<string, string>>(() => Object.fromEntries(initial.map((i) => [i.key, i.type])));
  const [pending, start] = useTransition();
  const [weeks, setWeeks] = useState(4);

  // Génère les jours à partir d'aujourd'hui
  const days: Date[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < weeks * 7; i++) { const d = new Date(today); d.setDate(today.getDate() + i); days.push(d); }

  function cycle(date: Date, slot: string) {
    const key = `${dayKey(date)}_${slot}`;
    const cur = map[key] ?? null;
    const idx = CYCLE.indexOf(cur);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setMap((m) => { const c = { ...m }; if (next) c[key] = next; else delete c[key]; return c; });
    start(async () => {
      if (next) await setMyAvailability(dayKey(date), slot, next);
      else await clearMyAvailability(dayKey(date), slot);
    });
  }

  function setWholeWeek(weekStart: Date, type: string) {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); dates.push(dayKey(d)); }
    setMap((m) => { const c = { ...m }; for (const ds of dates) c[`${ds}_JOURNEE`] = type; return c; });
    start(async () => { await bulkSetAvailability(dates, "JOURNEE", type); });
  }

  // Regroupe par semaine (lundi)
  const groups: { weekStart: Date; days: Date[] }[] = [];
  for (const d of days) {
    const last = groups[groups.length - 1];
    const monday = new Date(d); const wd = (d.getDay() + 6) % 7; monday.setDate(d.getDate() - wd);
    if (!last || dayKey(last.weekStart) !== dayKey(monday)) groups.push({ weekStart: monday, days: [d] });
    else last.days.push(d);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Légende :</span>
        {Object.entries(STYLE).map(([k, s]) => (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-2)" }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: s.bg, border: `1px solid ${s.fg}33` }} /> {s.label}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: pending ? "var(--primary)" : "var(--ink-4)" }}>
          {pending ? "Enregistrement…" : "Enregistré ✓"}
        </span>
      </Card>

      {groups.map((g) => (
        <Card key={dayKey(g.weekStart)}>
          <div className="spread" style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 14 }}>Semaine du {g.weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</strong>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setWholeWeek(g.weekStart, "DISPONIBLE")} disabled={pending}>Tout dispo</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setWholeWeek(g.weekStart, "INDISPONIBLE")} disabled={pending}>Tout indispo</button>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {g.days.map((d) => (
              <div key={dayKey(d)} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)", textTransform: "capitalize" }}>{fmtDay(d)}</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {SLOTS.map((s) => {
                    const key = `${dayKey(d)}_${s.id}`;
                    const st = map[key];
                    const style = st ? STYLE[st] : null;
                    return (
                      <button key={s.id} onClick={() => cycle(d, s.id)} disabled={pending}
                        style={{ padding: "8px 6px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${style ? style.fg + "44" : "var(--border)"}`, background: style ? style.bg : "var(--surface-3)", color: style ? style.fg : "var(--ink-3)" }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div style={{ textAlign: "center" }}>
        <button className="btn btn-secondary" onClick={() => setWeeks((w) => w + 4)}><Icon name="plus" size={15} /> Afficher 4 semaines de plus</button>
      </div>
    </div>
  );
}
