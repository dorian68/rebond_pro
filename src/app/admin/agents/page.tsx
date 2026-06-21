import { PageHeader, Card, AlertGlyph } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { runAdminSandboxAgents, type SandboxAgentReport, type SandboxSeverity } from "@/server/agentic/admin-sandbox";

export const dynamic = "force-dynamic";

const VERDICT_LABEL: Record<SandboxSeverity, string> = {
  ok: "OK",
  warning: "À surveiller",
  critical: "Critique",
};

const BADGE_CLASS: Record<SandboxSeverity, string> = {
  ok: "badge-positive",
  warning: "badge-warn",
  critical: "badge-danger",
};

const GLYPH: Record<SandboxSeverity, string> = {
  ok: "check-circle",
  warning: "alert-triangle",
  critical: "alert-circle",
};

function AgentCard({ report }: { report: SandboxAgentReport }) {
  return (
    <Card style={{ borderColor: report.verdict === "critical" ? "var(--danger-border)" : report.verdict === "warning" ? "var(--warn-border)" : undefined }}>
      <div className="spread" style={{ alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertGlyph type={report.verdict === "ok" ? "positive" : report.verdict === "critical" ? "danger" : "warn"} icon={GLYPH[report.verdict]} />
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 17, fontWeight: 800 }}>{report.name}</h2>
              <span className={"badge " + BADGE_CLASS[report.verdict]}>{VERDICT_LABEL[report.verdict]}</span>
              <span className="badge badge-neutral">Sandbox read-only</span>
            </div>
            <p className="muted-3" style={{ fontSize: 13, marginTop: 4 }}>{report.scope}</p>
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>Run : {new Date(report.generatedAt).toLocaleString("fr-FR")}</div>
      </div>

      <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 16 }}>{report.summary}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 18 }}>
        {report.metrics.map((m) => (
          <div key={m.label} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: m.tone === "critical" ? "var(--danger-bg)" : m.tone === "warning" ? "var(--warn-bg)" : "var(--surface)" }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{m.value}</div>
            <div className="muted" style={{ fontSize: 12 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Constats sandbox</h3>
          {report.findings.length === 0 ? (
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, color: "var(--ink-3)", fontSize: 13 }}>
              Aucun constat bloquant détecté par cet agent.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {report.findings.map((finding) => (
                <div key={`${finding.title}-${finding.detail}`} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span className={"badge " + BADGE_CLASS[finding.severity]}>{VERDICT_LABEL[finding.severity]}</span>
                    <strong style={{ fontSize: 13.5 }}>{finding.title}</strong>
                  </div>
                  <p className="muted-3" style={{ fontSize: 13 }}>{finding.detail}</p>
                  {finding.evidence && finding.evidence.length > 0 ? (
                    <ul style={{ marginTop: 8, paddingLeft: 18, color: "var(--ink-3)", fontSize: 12.5 }}>
                      {finding.evidence.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Recommandations</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {report.recommendations.map((r) => (
              <div key={r.title} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, background: "var(--surface)" }}>
                <strong style={{ fontSize: 13.5 }}>{r.title}</strong>
                <p className="muted-3" style={{ fontSize: 12.5, marginTop: 4 }}>{r.rationale}</p>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start", marginTop: 8, color: "var(--primary)", fontSize: 12.5, fontWeight: 700 }}>
                  <Icon name="arrow-right" size={14} style={{ marginTop: 1 }} />
                  {r.suggestedNextStep}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default async function AdminAgentsSandboxPage() {
  const reports = await runAdminSandboxAgents();

  return (
    <div className="fade-up">
      <PageHeader
        title="Agents sandbox"
        subtitle="Diagnostics agentiques réservés au super-admin. Lecture des vraies données, aucune mutation possible."
      />

      <Card style={{ marginBottom: 18, background: "var(--primary-50)", borderColor: "rgba(36,105,166,.18)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertGlyph type="primary" icon="shield" />
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Mode strictement sandbox</h2>
            <p style={{ color: "var(--ink-2)", fontSize: 13.5 }}>
              Ces agents scannent l'écosystème en lecture seule. Ils ne créent aucune session, ne valident aucun centre, ne génèrent aucun document,
              n'envoient aucun email et n'écrivent aucun journal métier.
            </p>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: 18 }}>
        {reports.map((report) => <AgentCard key={report.id} report={report} />)}
      </div>
    </div>
  );
}

