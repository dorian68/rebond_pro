import { requirePlatformAdmin } from "@/lib/platform";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { DOC_LABELS } from "@/lib/document-types";
import { DOCUMENT_VARIABLE_MAP } from "@/lib/document-variables";
import { PlatformTemplateRowActions, PlatformTemplateUploadForm } from "./platform-template-actions";

export const dynamic = "force-dynamic";

export default async function AdminDocumentTemplatesPage() {
  await requirePlatformAdmin();
  const templates = await prisma.documentTemplate.findMany({
    where: { organizationId: null },
    orderBy: [{ status: "asc" }, { type: "asc" }, { isDefault: "desc" }, { updatedAt: "desc" }],
  });
  const activeCount = templates.filter((t) => t.status === "ACTIVE").length;
  const defaultCount = templates.filter((t) => t.status === "ACTIVE" && t.isDefault).length;

  return (
    <div className="fade-up">
      <PageHeader title="Bibliothèque documentaire" subtitle="Modèles DOCX plateforme disponibles pour tous les centres." />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
        <Card><div style={{ fontSize: 24, fontWeight: 800 }}>{templates.length}</div><div className="muted">modèles plateforme</div></Card>
        <Card><div style={{ fontSize: 24, fontWeight: 800 }}>{activeCount}</div><div className="muted">actifs</div></Card>
        <Card><div style={{ fontSize: 24, fontWeight: 800 }}>{defaultCount}</div><div className="muted">par défaut</div></Card>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Ajouter un modèle global</h3>
        <p className="muted-3" style={{ fontSize: 13, marginBottom: 16 }}>
          Ces modèles sont visibles par tous les centres. Les modèles personnalisés d'un centre restent prioritaires sur cette bibliothèque.
        </p>
        <PlatformTemplateUploadForm />
      </Card>

      <Card pad={false}>
        <div style={{ padding: "18px 22px 0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>Modèles globaux ({templates.length})</h3>
        </div>
        {templates.length === 0 ? (
          <EmptyState icon="file-text" title="Aucun modèle global" text="Importez un premier fichier DOCX pour alimenter la bibliothèque plateforme." />
        ) : (
          <table className="tbl" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Modèle</th>
                <th>Variables</th>
                <th>Statut</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const recognized = t.variables.filter((v) => DOCUMENT_VARIABLE_MAP[v]);
                const unknown = t.variables.filter((v) => !DOCUMENT_VARIABLE_MAP[v]);
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>{DOC_LABELS[t.type] ?? t.type}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {t.sourceFileName ?? "—"} · moteur {t.engine} · v{t.version}
                      </div>
                      {t.description ? <div className="muted" style={{ fontSize: 12 }}>{t.description}</div> : null}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{t.variables.length} détectée(s) · {recognized.length} reconnue(s) · {unknown.length} inconnue(s)</div>
                      {unknown.length > 0 ? <div style={{ fontSize: 12, color: "var(--danger)" }}>{unknown.join(", ")}</div> : null}
                    </td>
                    <td>
                      <span className={"badge " + (t.status === "ACTIVE" ? "badge-positive" : "badge-neutral")}>{t.status}</span>
                      {t.isDefault ? <span className="badge badge-primary" style={{ marginLeft: 5 }}>Défaut</span> : null}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <PlatformTemplateRowActions id={t.id} isDefault={t.isDefault} status={t.status} />
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
