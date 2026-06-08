"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { deleteFormation, togglePublish } from "@/server/formations-actions";

export function PublishToggle({ id, isPublic }: { id: string; isPublic: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={"btn btn-sm " + (isPublic ? "btn-secondary" : "btn-secondary")}
      disabled={pending}
      onClick={() => start(async () => { await togglePublish(id); router.refresh(); })}
    >
      <Icon name="globe" size={15} /> {isPublic ? "Dépublier la page" : "Publier la page"}
    </button>
  );
}

export function DeleteFormationButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  if (!confirm) {
    return (
      <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirm(true)}>
        <Icon name="x" size={15} /> Supprimer
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Confirmer ?</span>
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => start(async () => { await deleteFormation(id); })}>Oui, supprimer</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Non</button>
    </span>
  );
}
