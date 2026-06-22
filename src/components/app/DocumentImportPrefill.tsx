"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { extractFileContent } from "@/lib/ag-ui/file-extractor";
import type { Attachment } from "@/lib/ag-ui/types";
import { DOCUMENT_INTAKE_LABELS, type DocumentIntakeDraft, type DocumentIntakeTarget } from "@/lib/document-intake";

type Props = {
  target: DocumentIntakeTarget;
  context?: Record<string, unknown>;
  onApply: (fields: Record<string, unknown>, draft: DocumentIntakeDraft) => void;
  onApplyMany?: (items: Record<string, unknown>[], draft: DocumentIntakeDraft) => void;
};

export function DocumentImportPrefill({ target, context, onApply, onApplyMany }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<DocumentIntakeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [routing, setRouting] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPending(true);
    setDraft(null);
    setError(null);
    setRouting(null);
    try {
      const extracted = await extractFileContent(file);
      setRouting(extracted.routingReason);
      const body = {
        target,
        filename: extracted.filename,
        extractedText: extracted.extractedText,
        attachments: extracted.attachment ? [extracted.attachment].filter(Boolean) as Attachment[] : undefined,
        context,
      };
      const res = await fetch("/api/document-intake/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null) as { ok?: boolean; error?: string; draft?: DocumentIntakeDraft } | null;
      if (!res.ok || !json?.ok || !json.draft) throw new Error(json?.error ?? "Extraction impossible.");
      setDraft(json.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction impossible.");
    } finally {
      setPending(false);
    }
  }

  const fieldCount = draft ? Object.keys(draft.fields).length : 0;
  const itemCount = draft?.items?.length ?? 0;

  return (
    <div className="card" style={{ padding: 14, borderStyle: "dashed", background: "var(--surface-2)", marginBottom: 16 }}>
      <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>Créer à partir d&apos;un document</div>
          <div className="muted-3" style={{ fontSize: 12.5, marginTop: 2 }}>
            Socrate prépare un brouillon de {DOCUMENT_INTAKE_LABELS[target]}. Rien n&apos;est enregistré.
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={pending}>
          <Icon name="paperclip" size={15} /> {pending ? "Analyse…" : "Importer un document"}
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,.docx,.xlsx,.csv,image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange} style={{ display: "none" }} />
      </div>

      {routing && <div className="muted-3" style={{ fontSize: 11.5, marginTop: 10 }}>{routing}</div>}
      {error && <div className="badge badge-danger" style={{ height: "auto", marginTop: 10, padding: "8px 10px", whiteSpace: "normal" }}>{error}</div>}

      {draft && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-primary">{fieldCount} champ{fieldCount > 1 ? "s" : ""} détecté{fieldCount > 1 ? "s" : ""}</span>
            {itemCount > 1 && <span className="badge badge-positive">{itemCount} fiches détectées</span>}
            <span className="badge badge-neutral">confiance {Math.round(draft.confidence * 100)} %</span>
            {draft.missingFields.length > 0 && <span className="badge badge-warn">{draft.missingFields.length} à compléter</span>}
          </div>
          {draft.warnings.length > 0 && (
            <div className="muted-3" style={{ fontSize: 12 }}>{draft.warnings.slice(0, 2).join(" · ")}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {onApplyMany && itemCount > 1 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onApplyMany(draft.items ?? [], draft)}>
                <Icon name="users" size={15} /> Préparer les {itemCount} fiches
              </button>
            )}
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onApply(draft.fields, draft)}>
              <Icon name="sparkles" size={15} /> Préremplir le formulaire
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
