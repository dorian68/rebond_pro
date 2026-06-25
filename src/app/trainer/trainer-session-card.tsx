"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange } from "@/lib/utils";
import { confirmTrainerSession } from "@/server/trainer-portal-actions";

type Session = {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  capacity: number;
  trainerConfirmed: boolean;
  formation: { title: string; color: string | null; modality: string };
  room: { name: string } | null;
  _count: { enrollments: number };
  moduleAssignments?: { module: { title: string } }[];
};

export function TrainerSessionCard({ session: s, trainerId }: { session: Session; trainerId: string }) {
  const [pending, start] = useTransition();
  const fillRate = s.capacity > 0 ? Math.round((s._count.enrollments / s.capacity) * 100) : 0;

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden",
      background: "#fff", borderLeft: `4px solid ${s.formation.color ?? "var(--primary)"}`,
    }}>
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{s.formation.title}</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span><Icon name="calendar" size={13} /> {formatDateRange(s.startDate, s.endDate)}</span>
              {s.room && <span><Icon name="map-pin" size={13} /> {s.room.name}</span>}
              <span><Icon name="users" size={13} /> {s._count.enrollments}/{s.capacity} inscrits</span>
            </div>
            {s.moduleAssignments && s.moduleAssignments.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600 }}>Vos modules :</span>
                {s.moduleAssignments.map((a, i) => (
                  <span key={i} className="badge badge-neutral" style={{ fontSize: 11 }}>{a.module.title}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {s.trainerConfirmed ? (
              <span className="badge badge-positive"><span className="dot" />Confirmé</span>
            ) : (
              <button
                onClick={() => start(async () => { await confirmTrainerSession(s.id); })}
                disabled={pending}
                className="btn btn-primary btn-sm"
              >
                <Icon name="check" size={15} /> {pending ? "…" : "Confirmer ma présence"}
              </button>
            )}
            <Link href={`/trainer/sessions/${s.id}`} className="btn btn-secondary btn-sm">
              Détail <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
