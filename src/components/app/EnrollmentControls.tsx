"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/labels";
import { setEnrollmentStatus, unenroll, enrollLearner } from "@/server/learners-actions";

export function StatusSelect({ enrollmentId, status }: { enrollmentId: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <select
      className="select"
      style={{ height: 30, width: "auto", fontSize: 12.5, opacity: pending ? 0.6 : 1 }}
      value={status}
      disabled={pending}
      onChange={(e) => start(async () => { await setEnrollmentStatus(enrollmentId, e.target.value); router.refresh(); })}
    >
      {Object.entries(ENROLLMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export function UnenrollButton({ enrollmentId }: { enrollmentId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn btn-ghost btn-icon" style={{ color: "var(--ink-3)", width: 30, height: 30 }} disabled={pending} title="Désinscrire"
      onClick={() => start(async () => { await unenroll(enrollmentId); router.refresh(); })}>
      <Icon name="x" size={15} />
    </button>
  );
}

export function EnrollPanel({ sessionId, learners }: { sessionId: string; learners: { id: string; firstName: string; lastName: string; company: string | null }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function add(formData: FormData) {
    start(async () => { await enrollLearner(sessionId, formData); router.refresh(); });
  }

  return (
    <form action={add} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select className="select" name="learnerId" required style={{ height: 34, fontSize: 13 }}>
        <option value="">Choisir un apprenant…</option>
        {learners.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}{l.company ? ` — ${l.company}` : ""}</option>)}
      </select>
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}><Icon name="plus" size={15} /> Inscrire</button>
    </form>
  );
}
