"use client";

import { useActionState, useEffect, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { generateDocumentsAction, getDocumentGenerationPreflightAction, type DocumentActionState } from "@/server/documents-actions";
import type { DocumentPreflight } from "@/server/documents/document-context";
import { DOC_LABELS, GENERATABLE_DOCUMENT_TYPES } from "@/lib/document-types";

type SessionOption = { id: string; label: string };
type TemplateOption = { id: string; type: string; name: string; engine: string };
type Suggestion = { sessionId: string; label: string; type: string; count: number; reason: string };
function StatusLine({ state }: { state: DocumentActionState | undefined }) {
  if (!state?.ok && !state?.error) return null;
  return (
    <span style={{ fontSize: 12, color: state.ok ? "var(--positive-600)" : "var(--danger)" }}>
      {state.ok ? state.message ?? "Document généré." : state.error}
    </span>
  );
}

export function SuggestionGenerateForm({ suggestion }: { suggestion: Suggestion }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(generateDocumentsAction, {});

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  return (
    <form action={action} style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
      <input type="hidden" name="type" value={suggestion.type} />
      <input type="hidden" name="sessionId" value={suggestion.sessionId} />
      <button type="submit" className="btn btn-secondary btn-sm" disabled={pending}>
        <Icon name="file-text" size={14} /> {pending ? "Génération..." : `Générer${suggestion.count > 1 ? ` (${suggestion.count})` : ""}`}
      </button>
      <StatusLine state={state} />
    </form>
  );
}

export function ManualGenerateForm({ sessions, templates }: { sessions: SessionOption[]; templates: TemplateOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(generateDocumentsAction, {});
  const [type, setType] = useState("CONVOCATION");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [templateId, setTemplateId] = useState("");
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>({});
  const [completionOpen, setCompletionOpen] = useState(false);
  const [activeMissingIndex, setActiveMissingIndex] = useState(0);
  const [preflight, setPreflight] = useState<DocumentPreflight | null>(null);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [preflightPending, startPreflight] = useTransition();
  const compatibleTemplates = templates.filter((t) => t.type === type);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  function resetPreflight() {
    setPreflight(null);
    setPreflightError(null);
    setCompletionOpen(false);
    setActiveMissingIndex(0);
  }

  function runPreflight() {
    const fd = new FormData();
    fd.set("type", type);
    fd.set("sessionId", sessionId);
    fd.set("templateId", templateId);
    fd.set("manualOverrides", JSON.stringify(manualOverrides));
    startPreflight(async () => {
      const result = await getDocumentGenerationPreflightAction(fd);
      if (result.ok) {
        setPreflight(result.preflight);
        setPreflightError(null);
        setActiveMissingIndex(0);
      } else {
        setPreflight(null);
        setPreflightError(result.error);
      }
    });
  }

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label className="field-label">Type de document</label>
        <select className="select" name="type" value={type} onChange={(e) => { setType(e.target.value); resetPreflight(); }}>
          {GENERATABLE_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Session</label>
        <select className="select" name="sessionId" required value={sessionId} onChange={(e) => { setSessionId(e.target.value); resetPreflight(); }}>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Modèle</label>
        <select className="select" name="templateId" value={templateId} onChange={(e) => { setTemplateId(e.target.value); resetPreflight(); }}>
          <option value="">Automatique : modèle DOCX du type, sinon PDF intégré</option>
          <option value="__builtin">Forcer le modèle PDF intégré</option>
          {compatibleTemplates.map((t) => (
            <option key={t.id} value={t.id}>{DOC_LABELS[t.type] ?? t.type} - {t.name} ({t.engine})</option>
          ))}
        </select>
      </div>
      <input type="hidden" name="manualOverrides" value={JSON.stringify(manualOverrides)} />
      <button type="button" className="btn btn-secondary" onClick={runPreflight} disabled={preflightPending || !sessionId}>
        <Icon name="search" size={15} /> {preflightPending ? "Analyse..." : "Analyser avant génération"}
      </button>
      {preflightError ? <span style={{ fontSize: 12, color: "var(--danger)" }}>{preflightError}</span> : null}
      {preflight ? (
        <PreflightCard
          preflight={preflight}
          completionOpen={completionOpen}
          setCompletionOpen={setCompletionOpen}
          activeMissingIndex={activeMissingIndex}
          setActiveMissingIndex={setActiveMissingIndex}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
        />
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="file-text" size={16} /> {pending ? "Génération..." : "Générer le document"}
        </button>
        {preflight?.missingVariables.length ? <span className="badge badge-warn">Générer quand même : {preflight.missingVariables.length} champ(s) à compléter</span> : null}
        <StatusLine state={state} />
      </div>
      <p className="muted-3" style={{ fontSize: 11.5 }}>Les documents individuels sont générés pour chaque apprenant inscrit ; l&apos;émargement liste tous les inscrits.</p>
    </form>
  );
}

function PreflightCard({
  preflight,
  completionOpen,
  setCompletionOpen,
  activeMissingIndex,
  setActiveMissingIndex,
  manualOverrides,
  setManualOverrides,
}: {
  preflight: DocumentPreflight;
  completionOpen: boolean;
  setCompletionOpen: (open: boolean) => void;
  activeMissingIndex: number;
  setActiveMissingIndex: (index: number) => void;
  manualOverrides: Record<string, string>;
  setManualOverrides: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  const cls = preflight.completionStatus === "COMPLETE" ? "badge-positive" : preflight.completionStatus === "PARTIAL" ? "badge-warn" : "badge-danger";
  const label = preflight.completionStatus === "COMPLETE" ? "Complet" : preflight.completionStatus === "PARTIAL" ? "À compléter" : "Brouillon";
  const missing = preflight.missingVariables.filter((m) => !manualOverrides[m.key]?.trim());
  const active = missing[Math.min(activeMissingIndex, Math.max(0, missing.length - 1))];
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-3)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
      <div className="spread" style={{ gap: 10 }}>
        <strong style={{ fontSize: 13 }}>Prévisualisation documentaire</strong>
        <span className={`badge ${cls}`}>{label} · {preflight.completionScore}%</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-2)" }}>
        Modèle : <strong>{preflight.template.name}</strong> · {preflight.engineLabel}
      </div>
      <div style={{ fontSize: 12 }}>
        {preflight.filledVariables.length} remplie(s) automatiquement · {preflight.missingVariables.length} à compléter · {preflight.unknownVariables.length} inconnue(s)
      </div>
      {preflight.missingVariables.length > 0 ? (
        <>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {preflight.missingVariables.slice(0, 8).map((m) => (
              <span key={m.key} className={manualOverrides[m.key]?.trim() ? "badge badge-positive" : "badge badge-warn"}>{m.label}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompletionOpen(!completionOpen)}>
              <Icon name="edit-3" size={14} /> {completionOpen ? "Masquer" : "Compléter vite"}
            </button>
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Optionnel : le document peut être généré tel quel.</span>
          </div>
        </>
      ) : null}
      {completionOpen && active ? (
        <div style={{ padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 3 }}>
              {Math.min(activeMissingIndex + 1, missing.length)} / {missing.length} information utile
            </div>
            <label className="field-label" style={{ marginBottom: 5 }}>{active.label}</label>
            <input
              className="input"
              value={manualOverrides[active.key] ?? ""}
              onChange={(e) => setManualOverrides((prev) => ({ ...prev, [active.key]: e.target.value }))}
              placeholder={`Ex. ${active.label}`}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={activeMissingIndex <= 0} onClick={() => setActiveMissingIndex(Math.max(0, activeMissingIndex - 1))}>Précédent</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={activeMissingIndex >= missing.length - 1} onClick={() => setActiveMissingIndex(Math.min(missing.length - 1, activeMissingIndex + 1))}>Suivant</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompletionOpen(false)}>Terminer</button>
          </div>
        </div>
      ) : null}
      {preflight.unknownVariables.length > 0 ? (
        <div style={{ fontSize: 12, color: "var(--danger)" }}>Variables inconnues : {preflight.unknownVariables.join(", ")}</div>
      ) : null}
    </div>
  );
}
