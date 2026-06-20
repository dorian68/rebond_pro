"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import { generateDocumentsBulkAsync } from "@/server/documents-actions";
import { DOC_LABELS, GENERATABLE_DOCUMENT_TYPES } from "@/lib/document-types";

type Session = { id: string; label: string };

type JobState = { jobId: string; status: "PENDING" | "RUNNING" | "DONE" | "FAILED"; error?: string };

function useJobPoller(jobId: string | null) {
  const [jobState, setJobState] = useState<JobState | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();
        if (!active) return;
        setJobState({ jobId, status: data.status, error: data.error });
        if (data.status === "DONE" || data.status === "FAILED") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch { /* ignore */ }
    };
    // État initial hors corps de l'effet (évite un setState synchrone).
    queueMicrotask(() => { if (active) setJobState({ jobId, status: "PENDING" }); });
    void poll();
    intervalRef.current = setInterval(poll, 1500);
    return () => { active = false; if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  return jobState;
}

export function BulkJobClient({ sessions }: { sessions: Session[] }) {
  const [type, setType] = useState("CONVOCATION");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [jobId, setJobId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const jobState = useJobPoller(jobId);

  const submit = () => {
    if (!sessionId || !type) return;
    setJobId(null);
    start(async () => {
      const result = await generateDocumentsBulkAsync(sessionId, type);
      setJobId(result.jobId);
    });
  };

  const reset = () => { setJobId(null); };

  return (
    <div className="card card-pad" style={{ borderTop: "3px solid var(--primary)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary-50)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="zap" size={16} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Génération en lot (async)</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Génère tous les documents d&apos;une session sans bloquer l&apos;interface.</div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <p className="muted-3" style={{ fontSize: 13 }}>Créez une session avec des inscrits pour activer la génération en lot.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="field-label">Type de document</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                {GENERATABLE_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Session</label>
              <select className="select" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <button onClick={submit} disabled={pending || (jobState?.status === "PENDING" || jobState?.status === "RUNNING")} className="btn btn-primary">
              <Icon name="zap" size={16} /> {pending ? "Démarrage…" : "Lancer la génération"}
            </button>
          </div>

          {/* Suivi du job */}
          {jobState && (
            <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: jobState.status === "DONE" ? "var(--positive-bg)" : jobState.status === "FAILED" ? "var(--danger-bg)" : "var(--primary-tint)", border: `1px solid ${jobState.status === "DONE" ? "var(--positive-200)" : jobState.status === "FAILED" ? "var(--danger-border)" : "var(--primary-100)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(jobState.status === "PENDING" || jobState.status === "RUNNING") && (
                  <div style={{ width: 14, height: 14, borderRadius: 99, border: "2px solid var(--primary)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                )}
                {jobState.status === "DONE" && <Icon name="check-circle" size={16} style={{ color: "var(--positive-600)" }} />}
                {jobState.status === "FAILED" && <Icon name="alert-circle" size={16} style={{ color: "var(--danger)" }} />}
                <span style={{ fontWeight: 700, fontSize: 13 }}>
                  {jobState.status === "PENDING" && "En attente…"}
                  {jobState.status === "RUNNING" && "Génération en cours…"}
                  {jobState.status === "DONE" && "Documents générés avec succès !"}
                  {jobState.status === "FAILED" && `Erreur : ${jobState.error ?? "inconnue"}`}
                </span>
                {(jobState.status === "DONE" || jobState.status === "FAILED") && (
                  <button onClick={reset} className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}><Icon name="x" size={14} /></button>
                )}
              </div>
              {jobState.status === "DONE" && (
                <p style={{ fontSize: 12, color: "var(--positive-600)", marginTop: 4 }}>
                  Rechargez la page pour voir les documents dans la liste.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
