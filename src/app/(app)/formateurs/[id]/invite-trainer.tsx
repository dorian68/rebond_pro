"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { inviteTrainer } from "@/server/trainers-actions";

export function InviteTrainerButton({ trainerId, linked, hasEmail }: { trainerId: string; linked: boolean; hasEmail: boolean }) {
  const [busy, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  if (linked && !result) {
    return <span className="badge badge-positive"><Icon name="user-check" size={13} /> Portail activé</span>;
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button className="btn btn-secondary btn-sm" disabled={busy || !hasEmail} title={!hasEmail ? "Renseignez d'abord un email" : undefined}
        onClick={() => start(async () => setResult((await inviteTrainer(trainerId)) ?? null))}>
        <Icon name="send" size={14} /> {busy ? "Invitation…" : "Inviter au portail"}
      </button>
      {result?.ok && <span style={{ fontSize: 12.5, color: "var(--success)" }}>✓ Invité</span>}
      {result?.error && <span style={{ fontSize: 12.5, color: "var(--danger)" }}>{result.error}</span>}
    </span>
  );
}
