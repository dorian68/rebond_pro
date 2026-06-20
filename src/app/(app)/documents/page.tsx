import { requireTenant } from "@/lib/tenant";
import { listDocuments, documentSuggestions } from "@/server/documents";
import { sessionOptions } from "@/server/options";
import { getDocumentTemplates } from "@/server/parametres";
import { Card, PageHeader, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatDate } from "@/lib/utils";
import { SendDocButton, DeleteDocButton } from "./doc-actions";
import { BulkJobClient } from "./bulk-job-client";
import { ManualGenerateForm, SuggestionGenerateForm } from "./generate-controls";
import { DOC_LABELS } from "@/lib/document-types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, [string, string]> = { A_GENERER: ["badge-warn", "À générer"], GENERE: ["badge-primary", "Généré"], ENVOYE: ["badge-positive", "Envoyé"] };

export default async function DocumentsPage() {
  const ctx = await requireTenant();
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);
  const [docs, suggestions, sessions, templates] = await Promise.all([listDocuments(ctx), documentSuggestions(ctx), sessionOptions(ctx), getDocumentTemplates(ctx)]);

  return (
    <div className="fade-up">
      <PageHeader title="Documents" subtitle="Générez et centralisez vos documents administratifs." />
      <p className="muted-3" style={{ fontSize: 12.5, marginTop: -14, marginBottom: 18 }}>Aide à la centralisation des documents utiles à votre démarche qualité.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* À générer */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>À générer</h3>
          {suggestions.length === 0 ? (
            <p className="muted-3" style={{ fontSize: 13 }}>Rien à générer pour l&apos;instant. 🎉</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.map((sug, i) => (
                <div key={i} className="spread" style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-3)", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sug.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{sug.reason}</div>
                  </div>
                  {canEdit && <SuggestionGenerateForm suggestion={sug} />}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Générateur manuel */}
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Générer un document</h3>
          {sessions.length === 0 ? (
            <p className="muted-3" style={{ fontSize: 13 }}>Créez une session pour générer des documents.</p>
          ) : canEdit ? (
            <ManualGenerateForm sessions={sessions} templates={templates} />
          ) : <p className="muted-3" style={{ fontSize: 13 }}>Lecture seule.</p>}
        </Card>
      </div>

      {/* Génération bulk async */}
      {canEdit && <div style={{ marginBottom: 16 }}><BulkJobClient sessions={sessions} /></div>}

      {/* Générés */}
      <Card pad={false}>
        <div style={{ padding: "18px 22px 0" }}><h3 style={{ fontSize: 15, fontWeight: 800 }}>Documents générés ({docs.length})</h3></div>
        {docs.length === 0 ? (
          <EmptyState icon="file-text" title="Aucun document généré" text="Générez vos premiers documents depuis les panneaux ci-dessus." />
        ) : (
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead><tr><th>Type</th><th>Concerne</th><th>Date</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {docs.map((d) => {
                const [cls, label] = STATUS_BADGE[d.status] ?? STATUS_BADGE.GENERE;
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{DOC_LABELS[d.type] ?? d.type}</td>
                    <td className="muted">
                      {d.target}
                      {d.templateName ? <span style={{ display: "block", fontSize: 11 }}>Modèle : {d.templateName}</span> : null}
                    </td>
                    <td className="muted">{formatDate(d.generatedAt)}</td>
                    <td><span className={"badge " + cls}>{label}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><Icon name="download" size={15} /> {d.mimeType?.includes("wordprocessingml") ? "DOCX" : "PDF"}</a>
                        {canEdit && <SendDocButton id={d.id} disabled={!d.hasEmail} />}
                        {canEdit && <DeleteDocButton id={d.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
