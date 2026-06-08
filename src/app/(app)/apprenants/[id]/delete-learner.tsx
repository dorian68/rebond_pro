"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteLearner } from "@/server/learners-actions";

export function DeleteLearnerButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) return <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirm(true)}><Icon name="x" size={15} /> Supprimer</button>;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Confirmer ?</span>
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => start(async () => { await deleteLearner(id); })}>Oui</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Non</button>
    </span>
  );
}
