"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { setSessionModuleAssignment } from "@/server/sessions-actions";

type TrainerOption = { id: string; firstName: string; lastName: string };
type ModuleRow = {
  id: string;
  title: string;
  position: number;
  eligible: TrainerOption[];
  assignedTrainerId: string | null;
};

export function SessionModulePanel({
  sessionId,
  modules,
  trainers,
  canEdit,
}: {
  sessionId: string;
  modules: ModuleRow[];
  trainers: TrainerOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyModule, setBusyModule] = useState<string | null>(null);

  function assign(moduleId: string, trainerId: string) {
    setError(null);
    setBusyModule(moduleId);
    start(async () => {
      const r = await setSessionModuleAssignment(sessionId, moduleId, trainerId || null);
      if (!r.ok) setError(r.error ?? "Erreur");
      else router.refresh();
      setBusyModule(null);
    });
  }

  // Options proposées par module : formateurs éligibles d'abord, puis le reste du centre.
  function optionsFor(m: ModuleRow): TrainerOption[] {
    const seen = new Set<string>();
    const ordered: TrainerOption[] = [];
    for (const t of [...m.eligible, ...trainers]) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      ordered.push(t);
    }
    return ordered;
  }

  return (
    <Card>
      <div className="spread" style={{ marginBottom: 12, gap: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800 }}>Formateurs par module ({modules.length})</h3>
        {error && <span className="badge badge-danger">{error}</span>}
      </div>
      <p className="muted-3" style={{ fontSize: 12.5, marginBottom: 14 }}>
        Cette formation est découpée en modules : affectez un formateur à chaque module pour cette session.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {modules.map((m, index) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: "var(--surface-3)" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{index + 1}. {m.title}</div>
              {m.eligible.length > 0 && (
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  Éligibles : {m.eligible.map((t) => `${t.firstName} ${t.lastName}`).join(", ")}
                </div>
              )}
            </div>
            {canEdit ? (
              <select
                className="input"
                style={{ width: 200, height: 34, fontSize: 13 }}
                value={m.assignedTrainerId ?? ""}
                disabled={pending && busyModule === m.id}
                onChange={(e) => assign(m.id, e.target.value)}
              >
                <option value="">— Non affecté —</option>
                {optionsFor(m).map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {(() => {
                  const t = trainers.find((x) => x.id === m.assignedTrainerId);
                  return t ? `${t.firstName} ${t.lastName}` : "Non affecté";
                })()}
              </span>
            )}
            {m.assignedTrainerId && <Icon name="check-circle" size={16} style={{ color: "var(--success)", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </Card>
  );
}
