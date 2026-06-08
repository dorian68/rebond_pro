"use client";

import { useTransition, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { markAttendance, addSessionNote } from "@/server/trainer-portal-actions";

type Enrollment = {
  id: string;
  status: string;
  learner: { firstName: string; lastName: string; email: string | null; company: string | null };
};

type Session = {
  id: string;
  notes: string | null;
  enrollments: Enrollment[];
};

function AttendanceRow({ enrollment, sessionId }: { enrollment: Enrollment; sessionId: string }) {
  const [pending, start] = useTransition();
  const isPresent = enrollment.status === "PRESENT";
  const isAbsent = enrollment.status === "ABSENT";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10,
      background: isPresent ? "var(--positive-bg)" : isAbsent ? "var(--danger-bg)" : "var(--surface-2)",
      border: `1px solid ${isPresent ? "var(--positive-200)" : isAbsent ? "var(--danger-border)" : "var(--border)"}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{enrollment.learner.firstName} {enrollment.learner.lastName}</div>
        {(enrollment.learner.email || enrollment.learner.company) && (
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
            {enrollment.learner.company && <span>{enrollment.learner.company}</span>}
            {enrollment.learner.email && enrollment.learner.company && " · "}
            {enrollment.learner.email && <span>{enrollment.learner.email}</span>}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => start(async () => { await markAttendance(enrollment.id, sessionId, true); })}
          disabled={pending}
          className={`btn btn-sm ${isPresent ? "btn-primary" : "btn-secondary"}`}
          style={isPresent ? {} : {}}
          title="Marquer présent"
        >
          <Icon name="check" size={15} />
          {isPresent ? "Présent" : "Présent"}
        </button>
        <button
          onClick={() => start(async () => { await markAttendance(enrollment.id, sessionId, false); })}
          disabled={pending}
          className={`btn btn-sm ${isAbsent ? "btn-danger" : "btn-ghost"}`}
          title="Marquer absent"
        >
          <Icon name="x" size={15} />
          {isAbsent ? "Absent" : "Absent"}
        </button>
      </div>
    </div>
  );
}

function NoteEditor({ sessionId, initialNote }: { sessionId: string; initialNote: string | null }) {
  const [note, setNote] = useState(initialNote ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const save = () => start(async () => {
    await addSessionNote(sessionId, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 12 }}>Note post-session</h3>
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        className="input"
        placeholder="Difficultés rencontrées, suggestions, points à améliorer…"
        rows={4}
        style={{ resize: "vertical", marginBottom: 10 }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={save} disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        {saved && <span style={{ fontSize: 12.5, color: "var(--positive-600)", display: "flex", alignItems: "center", gap: 4 }}><Icon name="check" size={14} /> Sauvegardé</span>}
      </div>
    </div>
  );
}

export function AttendanceClient({ session }: { session: Session }) {
  const presentCount = session.enrollments.filter((e) => e.status === "PRESENT").length;
  const absentCount = session.enrollments.filter((e) => e.status === "ABSENT").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Résumé émargement */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {[
          { label: "Total", value: session.enrollments.length, color: "var(--ink)" },
          { label: "Présents", value: presentCount, color: "var(--positive-600)" },
          { label: "Absents", value: absentCount, color: "var(--danger)" },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: "14px 18px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Feuille d'émargement */}
      <div className="card card-pad">
        <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 14 }}>Feuille d&apos;émargement</h3>
        {session.enrollments.length === 0 && (
          <p style={{ color: "var(--ink-3)", fontSize: 13 }}>Aucun inscrit pour cette session.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {session.enrollments.map((e) => (
            <AttendanceRow key={e.id} enrollment={e} sessionId={session.id} />
          ))}
        </div>
      </div>

      {/* Note post-session */}
      <NoteEditor sessionId={session.id} initialNote={session.notes} />
    </div>
  );
}
