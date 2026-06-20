import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { getDashboardMetrics } from "@/server/metrics";
import { Card, PageHeader, AlertGlyph } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { AreaChart, BarList, PipelineBars } from "@/components/ui/charts";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function KpiCard({ label, value, icon, sub, urgent }: { label: string; value: string; icon: string; sub?: string; urgent?: boolean }) {
  return (
    <Card style={{ padding: 18 }}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: urgent ? "var(--warn-bg)" : "var(--primary-50)", color: urgent ? "var(--warn-strong)" : "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} />
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

export default async function DashboardPage() {
  const ctx = await requireTenant();
  const m = await getDashboardMetrics(ctx);
  const setupComplete = m.setup.formationCount > 0 && m.setup.sessionCount > 0 && m.setup.trainerCount > 0;
  const setupItems = [
    { label: "Ajouter une formation", done: m.setup.formationCount > 0, href: "/formations/new" },
    { label: "Planifier une session", done: m.setup.sessionCount > 0, href: "/sessions/new" },
    { label: "Ajouter un formateur", done: m.setup.trainerCount > 0, href: "/formateurs/new" },
    { label: "Qualifier un prospect", done: m.setup.prospectCount > 0, href: "/prospects/new", optional: true },
  ];

  return (
    <div className="fade-up">
      <PageHeader title={`Bonjour, ${ctx.name?.split(" ")[0] ?? "bienvenue"} 👋`} subtitle={`Voici le pilotage de ${ctx.organizationName ?? "votre centre"} aujourd'hui.`} />

      {!setupComplete && (
        <Card style={{ marginBottom: 18, background: "var(--primary-tint)", borderColor: "var(--primary-100)" }}>
          <div className="spread" style={{ gap: 16, flexWrap: "wrap" }}>
            <div>
              <span className="eyebrow">Activation du cockpit</span>
              <h2 style={{ fontSize: 18, margin: "7px 0 4px" }}>Transformez ce tableau vide en prochaines actions utiles.</h2>
              <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Complétez les repères opérationnels. Chaque donnée alimente réellement le planning, le CRM et les indicateurs.</p>
            </div>
            <Link href="/onboarding" className="btn btn-primary btn-sm">Reprendre la configuration</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginTop: 16 }}>
            {setupItems.map((item) => (
              <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "#fff", border: "1px solid var(--border)" }}>
                <Icon name={item.done ? "check-circle" : "circle"} size={16} style={{ color: item.done ? "var(--positive)" : "var(--ink-3)" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.label}{item.optional ? " · optionnel" : ""}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
        <KpiCard label="CA prévisionnel" value={formatMoney(m.kpis.caForecast)} icon="trending-up" sub={`Trimestre : ${formatMoney(m.kpis.caQuarter)}`} />
        <KpiCard label="Sessions à venir" value={String(m.kpis.sessionsAVenir)} icon="calendar" sub="toutes dates futures" />
        <KpiCard label="Taux de remplissage" value={`${m.kpis.avgFill} %`} icon="gauge" sub="objectif 70 %" />
        <KpiCard label="Prospects actifs" value={String(m.kpis.prospectsActifs)} icon="users" sub="pipeline" />
        <KpiCard label="Relances à faire" value={String(m.kpis.relances)} icon="send" sub="cette semaine" urgent={m.kpis.relances > 0} />
        <KpiCard label="Documents à générer" value={String(m.kpis.docsToGenerate)} icon="file-text" sub="en attente" urgent={m.kpis.docsToGenerate > 0} />
      </div>

      {/* Bloc IA */}
      {m.aiReco && (
        <div className="card card-pad fade-up" style={{ marginBottom: 18, background: "linear-gradient(135deg, #f2f8fc, #ffffff)", border: "1px solid var(--primary-100)" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#2f9488,#2469a6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="sparkles" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Recommandation de l&apos;assistant</div>
              <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{m.aiReco.text}</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <Link href="/prospects" className="btn btn-ai btn-sm"><Icon name="send" size={15} /> Voir les relances</Link>
                <Link href="/prospects" className="btn btn-secondary btn-sm">Voir les prospects</Link>
                <Link href="/planning" className="btn btn-secondary btn-sm">Optimiser le planning</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graphes */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 18 }}>
        <Card>
          <div className="spread" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>Évolution du CA prévisionnel</h3>
            <span className="badge badge-primary">k€</span>
          </div>
          <AreaChart data={m.series} />
        </Card>
        <Card>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 16 }}>Remplissage par formation</h3>
          <BarList items={m.fillByFormation} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <Card>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 16 }}>Pipeline commercial</h3>
          <PipelineBars items={m.pipeline} />
        </Card>

        {/* Priorités */}
        <Card>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 14 }}>Priorités de la semaine</h3>
          {m.priorities.length === 0 && <p className="muted-3" style={{ fontSize: 13 }}>{setupComplete ? "Aucune priorité urgente détectée." : "Configurez les premiers éléments pour obtenir des priorités calculées."}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {m.priorities.map((p) => (
              <Link key={p.id} href={p.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--surface-3)" }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--primary-50)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <Icon name="list-checks" size={13} />
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.text}</span>
                <Icon name="chevron-right" size={16} style={{ color: "var(--ink-4)" }} />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertes */}
      <Card>
        <h3 style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 14 }}>Alertes</h3>
        {m.alerts.length === 0 && <p className="muted-3" style={{ fontSize: 13 }}>{setupComplete ? "Aucune alerte active." : "Les alertes apparaîtront dès que le cockpit disposera de données opérationnelles."}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {m.alerts.map((a) => (
            <Link key={a.id} href={a.href} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)" }}>
              <AlertGlyph type={a.type} icon={a.icon} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2, lineHeight: 1.45 }}>{a.text}</div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
