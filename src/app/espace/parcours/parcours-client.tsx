"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { setBilanStepStatus, saveBilanStepNotes } from "@/server/beneficiary-self-actions";

type Step = { id: string; phase: string; title: string; description: string | null; status: string; notes: string | null };

const NEXT: Record<string, "todo" | "in_progress" | "done"> = { todo: "in_progress", in_progress: "done", done: "todo" };
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
  todo: { bg: "var(--surface-3)", fg: "var(--ink-3)", label: "À faire", icon: "circle" },
  in_progress: { bg: "#fff4e0", fg: "#a86617", label: "En cours", icon: "play" },
  done: { bg: "#e7f7ee", fg: "#137a45", label: "Terminé", icon: "check-circle" },
};

export function ParcoursClient({ phases, steps }: { phases: { id: string; label: string }[]; steps: Step[] }) {
  const [local, setLocal] = useState<Record<string, string>>(() => Object.fromEntries(steps.map((s) => [s.id, s.status])));
  const [, start] = useTransition();

  function toggle(id: string) {
    const next = NEXT[local[id] ?? "todo"];
    setLocal((m) => ({ ...m, [id]: next }));
    start(() => setBilanStepStatus(id, next));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {phases.map((phase, pi) => {
        const phaseSteps = steps.filter((s) => s.phase === phase.id);
        if (phaseSteps.length === 0) return null;
        const done = phaseSteps.filter((s) => (local[s.id] ?? s.status) === "done").length;
        return (
          <Card key={phase.id}>
            <div className="spread" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{pi + 1}</span>
                <strong style={{ fontSize: 15.5 }}>{phase.label}</strong>
              </div>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>{done}/{phaseSteps.length}</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {phaseSteps.map((s) => {
                const st = local[s.id] ?? s.status;
                const style = STATUS_STYLE[st];
                return (
                  <div key={s.id} style={{ display: "flex", gap: 12, padding: 12, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <button onClick={() => toggle(s.id)} title="Changer le statut"
                      style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, cursor: "pointer", border: `1px solid ${style.fg}33`, background: style.bg, color: style.fg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={style.icon} size={17} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="spread">
                        <strong style={{ fontSize: 14, textDecoration: st === "done" ? "line-through" : "none", color: st === "done" ? "var(--ink-3)" : "var(--ink)" }}>{s.title}</strong>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: style.fg }}>{style.label}</span>
                      </div>
                      {s.description && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{s.description}</p>}
                      <NoteEditor stepId={s.id} initial={s.notes ?? ""} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function NoteEditor({ stepId, initial }: { stepId: string; initial: string }) {
  const [open, setOpen] = useState(!!initial);
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();

  if (!open) return <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => setOpen(true)}><Icon name="edit" size={13} /> Ajouter une note</button>;
  return (
    <div style={{ marginTop: 8 }}>
      <textarea className="input" rows={2} value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} placeholder="Mes notes, réflexions…" />
      <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} onClick={() => start(async () => { await saveBilanStepNotes(stepId, value); setSaved(true); })}>
        {saved ? "✓ Enregistré" : "Enregistrer la note"}
      </button>
    </div>
  );
}
