"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import { uploadPlatformDocumentTemplate, setDefaultPlatformDocumentTemplate, archivePlatformDocumentTemplate } from "@/server/platform-document-templates-actions";
import type { FormActionState } from "@/server/formations-actions";

export function PlatformTemplateUploadForm() {
  const [state, action, pending] = useActionState<FormActionState, FormData>(uploadPlatformDocumentTemplate, undefined);

  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label className="label">Type de document</label>
          <select name="type" className="input" required>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Nom du modèle</label>
          <input name="name" className="input" required placeholder="Convocation standard plateforme" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <input name="description" className="input" placeholder="Modèle fourni par Le Bon Rebond pour tous les centres" />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
        <input type="checkbox" name="isDefault" /> Définir comme modèle plateforme par défaut pour ce type
      </label>
      <div>
        <label className="label">Fichier DOCX</label>
        <input name="file" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="input" required />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="upload" size={15} /> {pending ? "Import..." : "Importer dans la bibliothèque plateforme"}
        </button>
        {state?.ok && <span style={{ color: "var(--success)", fontSize: 13 }}>Modèle plateforme importé.</span>}
        {state?.error && <span style={{ color: "var(--danger)", fontSize: 13 }}>{state.error}</span>}
      </div>
    </form>
  );
}

export function PlatformTemplateRowActions({ id, isDefault, status }: { id: string; isDefault: boolean; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (status !== "ACTIVE") return null;

  return (
    <div style={{ display: "inline-flex", gap: 6 }}>
      {!isDefault && (
        <button
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={() => start(async () => { await setDefaultPlatformDocumentTemplate(id); router.refresh(); })}
        >
          Défaut
        </button>
      )}
      <button
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() => start(async () => { await archivePlatformDocumentTemplate(id); router.refresh(); })}
      >
        Archiver
      </button>
    </div>
  );
}
