"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deleteProspect } from "@/server/prospects-actions";
import { generateRelance } from "@/server/ai-actions";

export function DeleteProspectButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  if (!confirm) return <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => setConfirm(true)}><Icon name="x" size={15} /> Supprimer</button>;
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Confirmer ?</span>
      <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => start(async () => { await deleteProspect(id); })}>Oui</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(false)}>Non</button>
    </span>
  );
}

export function RelanceGenerator({ prospectId }: { prospectId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    setOpen(true);
    setSource(null);
    start(async () => {
      const r = await generateRelance(prospectId);
      setText(r.text);
      setSource(r.source);
    });
  };

  return (
    <>
      <button className="btn btn-ai btn-sm" onClick={run}><Icon name="sparkles" size={15} /> Générer une relance</button>
      {open && (
        <div onClick={() => setOpen(false)} className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,24,35,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: 560, maxWidth: "100%", background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
            <div className="spread" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-2)", background: "var(--primary-tint)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#6a5cf0,#5850ec)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="sparkles" size={16} /></div>
                <h3 style={{ fontSize: 16 }}>Relance suggérée</h3>
              </div>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" style={{ color: "var(--ink-3)" }}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>
                {pending ? "Génération en cours…" : source === "ai" ? "Généré par l'IA — relisez et personnalisez avant envoi." : "Brouillon (modèle) — ajoutez une clé ANTHROPIC_API_KEY pour une génération IA personnalisée."}
              </p>
              <textarea className="input" value={pending ? "…" : text} onChange={(e) => setText(e.target.value)} rows={12} style={{ fontSize: 13 }} />
            </div>
            <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-2)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--surface-2)" }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Fermer</button>
              <button className="btn btn-primary" disabled={pending} onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                <Icon name={copied ? "check" : "copy"} size={16} /> {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
