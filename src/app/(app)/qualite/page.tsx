import { requireTenant } from "@/lib/tenant";
import { getQualityMetrics } from "@/server/qualite";
import { PageHeader, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { QualiteClient } from "./qualite-client";

export const dynamic = "force-dynamic";

function KpiCard({ label, value, icon, sub, tone = "neutral" }: {
  label: string; value: string; icon: string; sub?: string;
  tone?: "neutral" | "positive" | "warn" | "danger";
}) {
  const bg = tone === "danger" ? "var(--danger-bg)" : tone === "warn" ? "var(--warn-bg)" : tone === "positive" ? "var(--positive-bg)" : "var(--primary-50)";
  const color = tone === "danger" ? "var(--danger-strong)" : tone === "warn" ? "var(--warn-strong)" : tone === "positive" ? "var(--positive-600)" : "var(--primary)";
  return (
    <Card style={{ padding: 18 }}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: bg, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function SatisfactionGraph({ series }: { series: { m: string; v: number | null }[] }) {
  const values = series.map((s) => s.v).filter((v): v is number => v !== null);
  const max = values.length ? Math.max(...values) : 5;
  const minY = 0;

  return (
    <Card>
      <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 16 }}>Évolution de la satisfaction</h3>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
        {series.map((s) => {
          const height = s.v !== null ? Math.max(4, Math.round(((s.v - minY) / (max - minY || 1)) * 80)) : 0;
          return (
            <div key={s.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{s.v !== null ? s.v.toFixed(1) : "—"}</span>
              <div style={{ width: "100%", height: `${height}px`, background: s.v !== null ? (s.v >= 4 ? "var(--positive-600)" : s.v >= 3 ? "var(--warn-strong)" : "var(--danger)") : "var(--surface-3)", borderRadius: "4px 4px 0 0", minHeight: s.v !== null ? 4 : 0 }} />
              <span style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 600 }}>{s.m}</span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 8 }}>Satisfaction moyenne sur 5 — 6 derniers mois.</p>
    </Card>
  );
}

export default async function QualitePage() {
  const ctx = await requireTenant();
  const metrics = await getQualityMetrics(ctx);

  const satTone = metrics.avgSatisfaction === null ? "neutral" : metrics.avgSatisfaction >= 4 ? "positive" : metrics.avgSatisfaction >= 3 ? "warn" : "danger";
  const complaintTone = metrics.openComplaints === 0 ? "positive" : metrics.openComplaints <= 2 ? "warn" : "danger";

  return (
    <div className="fade-up">
      <PageHeader
        title="Qualité"
        subtitle="Centralisez réclamations, actions correctives et retours apprenants."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
        <KpiCard
          label="Satisfaction moyenne"
          value={metrics.avgSatisfaction !== null ? `${metrics.avgSatisfaction}/5` : "—"}
          icon="star"
          sub={`${metrics.feedbacks.length} retour${metrics.feedbacks.length !== 1 ? "s" : ""}`}
          tone={satTone}
        />
        <KpiCard
          label="Taux de présence"
          value={metrics.attendanceRate !== null ? `${metrics.attendanceRate}%` : "—"}
          icon="user-check"
          sub="apprenants présents"
          tone={metrics.attendanceRate === null ? "neutral" : metrics.attendanceRate >= 80 ? "positive" : "warn"}
        />
        <KpiCard
          label="Taux de complétion"
          value={metrics.completionRate !== null ? `${metrics.completionRate}%` : "—"}
          icon="graduation-cap"
          sub="formations terminées"
          tone={metrics.completionRate === null ? "neutral" : metrics.completionRate >= 80 ? "positive" : "warn"}
        />
        <KpiCard
          label="Réclamations ouvertes"
          value={String(metrics.openComplaints)}
          icon="alert-circle"
          sub={`${metrics.openActions} action${metrics.openActions !== 1 ? "s" : ""} corrective${metrics.openActions !== 1 ? "s" : ""} en cours`}
          tone={complaintTone}
        />
      </div>

      <SatisfactionGraph series={metrics.series} />

      <div style={{ marginTop: 18 }}>
        <QualiteClient metrics={metrics} />
      </div>

      <p style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 20, padding: "10px 14px", background: "var(--surface-3)", borderRadius: 10 }}>
        RebondPro aide à centraliser les éléments utiles à votre démarche qualité. Ces outils ne constituent pas une certification Qualiopi ni un audit officiel.
      </p>
    </div>
  );
}
