"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { sendDocument, deleteDocument } from "@/server/documents-actions";

export function SendDocButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button className="btn btn-ghost btn-sm" disabled={pending || disabled} title={disabled ? "Pas d'email destinataire" : "Envoyer par email"}
        onClick={() => start(async () => { const r = await sendDocument(id); setMsg(r.ok ? "Envoyé ✓" : r.error ?? "Erreur"); router.refresh(); setTimeout(() => setMsg(null), 2500); })}>
        <Icon name="mail" size={15} /> {pending ? "Envoi…" : "Envoyer"}
      </button>
      {msg && <span style={{ fontSize: 11.5, color: msg.includes("✓") ? "var(--positive-600)" : "var(--danger)" }}>{msg}</span>}
    </span>
  );
}

export function DeleteDocButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: "var(--ink-3)" }} disabled={pending} title="Supprimer"
      onClick={() => start(async () => { await deleteDocument(id); router.refresh(); })}>
      <Icon name="x" size={15} />
    </button>
  );
}
