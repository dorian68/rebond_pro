"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { generateDocumentsAction, type DocumentActionState } from "@/server/documents-actions";
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

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label className="field-label">Type de document</label>
        <select className="select" name="type" defaultValue="CONVOCATION">
          {GENERATABLE_DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOC_LABELS[t]}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Session</label>
        <select className="select" name="sessionId" required>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="field-label">Modèle</label>
        <select className="select" name="templateId" defaultValue="">
          <option value="">Automatique : modèle DOCX du type, sinon PDF intégré</option>
          <option value="__builtin">Forcer le modèle PDF intégré</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{DOC_LABELS[t.type] ?? t.type} - {t.name} ({t.engine})</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="file-text" size={16} /> {pending ? "Génération..." : "Générer le document"}
        </button>
        <StatusLine state={state} />
      </div>
      <p className="muted-3" style={{ fontSize: 11.5 }}>Les documents individuels sont générés pour chaque apprenant inscrit ; l&apos;émargement liste tous les inscrits.</p>
    </form>
  );
}
