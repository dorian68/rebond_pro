"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { improveFormationDescription, applyFormationDescription } from "@/server/ai-actions";

export function ImproveDescription({ formationId, canEdit }: { formationId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [pending, start] = useTransition();
  const [saving, startSave] = useTransition();
  const router = useRouter();

  const run = () => {
    setOpen(true);
    setSource(null);
    start(async () => {
      const r = await improveFormationDescription(formationId);
      setText(r.text);
      setSource(r.source);
    });
  };

  return (
    <>
      <div className="card card-pad" style={{ background: "linear-gradient(135deg,#f2f8fc,#fff)", border: "1px solid var(--primary-100)" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#2f9488,#2469a6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Icon name="sparkles" size={17} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 3 }}>Améliorer la description (IA)</div>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.45, marginBottom: 10 }}>Génère une description commerciale optimisée pour la conversion.</p>
            <button className="btn btn-ai btn-sm" onClick={run}><Icon name="wand" size={15} /> Générer</button>
          </div>
        </div>
      </div>

      {open && (
        <div onClick={() => setOpen(false)} className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,24,35,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="fade-up" style={{ width: 600, maxWidth: "100%", background: "var(--surface)", borderRadius: 18, boxShadow: "var(--shadow-pop)", overflow: "hidden" }}>
            <div className="spread" style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-2)", background: "var(--primary-tint)" }}>
              <h3 style={{ fontSize: 16 }}>Description commerciale</h3>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-icon" style={{ color: "var(--ink-3)" }}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 10 }}>{pending ? "Génération…" : source === "ai" ? "Proposition générée par l'IA." : "Proposition (modèle) — ajoutez une clé ANTHROPIC_API_KEY pour l'IA."}</p>
              <textarea className="input" value={pending ? "…" : text} onChange={(e) => setText(e.target.value)} rows={10} style={{ fontSize: 13 }} />
            </div>
            <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-2)", display: "flex", justifyContent: "flex-end", gap: 10, background: "var(--surface-2)" }}>
              <button className="btn btn-secondary" onClick={() => setOpen(false)}>Fermer</button>
              {canEdit && (
                <button className="btn btn-primary" disabled={pending || saving} onClick={() => startSave(async () => { await applyFormationDescription(formationId, text); setOpen(false); router.refresh(); })}>
                  <Icon name="check" size={16} /> {saving ? "Application…" : "Appliquer à la formation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
