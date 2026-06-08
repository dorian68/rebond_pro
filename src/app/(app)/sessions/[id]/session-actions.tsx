"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { deleteSession, confirmTrainer } from "@/server/sessions-actions";

export function ConfirmTrainerButton({ id, confirmed, hasTrainer }: { id: string; confirmed: boolean; hasTrainer: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!hasTrainer) return null;
  return (
    <button className={"btn btn-sm " + (confirmed ? "btn-secondary" : "btn-primary")} disabled={pending}
      onClick={() => start(async () => { await confirmTrainer(id); router.refresh(); })}>
      <Icon name={confirmed ? "user-x" : "user-check"} size={15} /> {confirmed ? "Marquer non confirmé" : "Confirmer le formateur"}
    </button>
  );
}

export function DeleteSessionButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) {
    return <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirm(true)}><Icon name="x" size={15} /> Supprimer</button>;
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Confirmer ?</span>
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => start(async () => { await deleteSession(id); })}>Oui</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Non</button>
    </span>
  );
}
