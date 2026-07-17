import Link from "next/link";
import { getPlatformOverview, listAllBeneficiaries, listAllCenters, listPendingMarketplaceCenters } from "@/server/platform";
import { getFinanceSummary } from "@/server/finance";
import { PageHeader, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/utils";
import { MarketplaceModerationButtons } from "./marketplace-actions";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [m, centers, beneficiaries, finance, pending] = await Promise.all([
    getPlatformOverview(),
    listAllCenters(),
    listAllBeneficiaries(),
    getFinanceSummary(),
    listPendingMarketplaceCenters(),
  ]);

  const kpis = [
    { label: "Centres de formation", value: m.centers, icon: "building", href: "/admin/centres" },
    { label: "Formateurs actifs", value: m.trainers, icon: "presentation", href: "/admin/formateurs" },
    { label: "Bénéficiaires (bilan)", value: m.beneficiaries, icon: "smile", href: "/admin/beneficiaires" },
    { label: "Apprenants inscrits", value: m.learners, icon: "grad" },
    { label: "Formations publiées", value: m.publishedFormations, icon: "book" },
    { label: "À valider (marketplace)", value: m.pendingMarketplace, icon: "shield" },
    { label: "Prospects actifs", value: m.activeProspects, icon: "target" },
    { label: "Centres abonnés", value: m.paidOrgs, icon: "euro" },
  ];

  return (
    <div className="fade-up">
      <PageHeader title="Pilotage de l'écosystème" subtitle="Vue consolidée de l'ensemble du réseau : centres, formateurs et bénéficiaires." />

      {/* File d'attente de modération marketplace */}
      <Card style={{ marginBottom: 18, borderColor: pending.length ? "var(--warn-border)" : undefined, background: pending.length ? "var(--warn-bg)" : undefined }}>
        <div className="spread" style={{ marginBottom: pending.length ? 14 : 0 }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="shield" size={17} style={{ color: "var(--warn-strong)" }} />
            Validation marketplace
            {pending.length > 0 && <span className="badge badge-warn">{pending.length} à valider</span>}
          </h3>
        </div>
        {pending.length === 0 ? (
          <p className="muted-3" style={{ fontSize: 13 }}>Aucun centre en attente. Les centres apparaissent ici dès qu&apos;ils publient une formation, et ne sont visibles sur la marketplace qu&apos;une fois validés.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Centre</th><th>Ville</th><th>Formations prêtes</th><th>Statut</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
            <tbody>
              {pending.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}><Link href={`/admin/centres/${o.id}`} style={{ color: "var(--primary)" }}>{o.name}</Link></td>
                  <td className="muted">{o.city ?? "—"}</td>
                  <td className="tnum">{o._count.formations} formation{o._count.formations > 1 ? "s" : ""}</td>
                  <td><span className={"badge " + (o.marketplaceStatus === "REJECTED" ? "badge-danger" : "badge-warn")}>{o.marketplaceStatus === "REJECTED" ? "Refusé" : "À valider"}</span></td>
                  <td style={{ textAlign: "right" }}><MarketplaceModerationButtons orgId={o.id} status={o.marketplaceStatus} publicProfileEnabled={o.publicProfileEnabled} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        <Link href="/admin/finances" style={{ background: "linear-gradient(135deg,#2469a6,#2f9488)", color: "#fff", borderRadius: 16, padding: "18px 22px" }}>
          <div style={{ fontSize: 12.5, opacity: .85, fontWeight: 600 }}>Commissions plateforme (revenus réels)</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{formatMoney(finance.totalCommission)}</div>
          <div style={{ fontSize: 12, opacity: .8, marginTop: 4 }}>{finance.count} transaction{finance.count > 1 ? "s" : ""} · tracer le détail →</div>
        </Link>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 22px" }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 600 }}>Volume réseau (brut encaissé)</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{formatMoney(finance.totalGross)}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>Formations {formatMoney(finance.byType.FORMATION_PURCHASE.amount)} · Abos {formatMoney(finance.byType.SUBSCRIPTION.amount)} · Bilans {formatMoney(finance.byType.BILAN.amount)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {kpis.map((k) => {
          const inner = (
            <div style={{ padding: "16px 18px", border: "1px solid var(--border)", borderRadius: 14, background: "#fff", height: "100%" }}>
              <Icon name={k.icon} size={18} style={{ color: "var(--primary)" }} />
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 8 }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{k.label}</div>
            </div>
          );
          return k.href ? <Link key={k.label} href={k.href}>{inner}</Link> : <div key={k.label}>{inner}</div>;
        })}
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div className="spread" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 15 }}>Dossiers de prestation Le Bon Rebond</h3>
            <p className="muted-3" style={{ fontSize: 13, marginTop: 3 }}>Accès rapide aux accompagnements adultes/jeunes, exports PDF et envois bénéficiaires.</p>
          </div>
          <Link href="/admin/beneficiaires" className="btn btn-secondary btn-sm">Tout voir</Link>
        </div>
        {beneficiaries.length === 0 ? (
          <p className="muted-3" style={{ fontSize: 13 }}>Aucun dossier bénéficiaire pour le moment.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {beneficiaries.slice(0, 6).map((b) => (
              <Link key={b.id} href={`/admin/beneficiaires/${b.id}`} style={{ padding: 13, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
                <div className="spread" style={{ gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 850, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.firstName} {b.lastName}</div>
                    <div className="muted-3" style={{ fontSize: 12 }}>{b.email ?? "Email manquant"}</div>
                  </div>
                  <span className="badge badge-primary">{b.progress}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "#e8eaef", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${b.progress}%`, background: "linear-gradient(90deg,#2f9488,#2469a6)" }} />
                </div>
                <div className="muted-3" style={{ fontSize: 11.5 }}>{b.stepsDone}/{b.stepsTotal} étapes · {b.organization.name}</div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="spread" style={{ marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>Centres du réseau ({centers.length})</h3>
          <Link href="/admin/centres" className="btn btn-secondary btn-sm">Tout voir</Link>
        </div>
        <table className="tbl">
          <thead><tr><th>Centre</th><th>Ville</th><th>Plan</th><th>Formateurs</th><th>Formations</th><th>Sessions</th><th>Bénéf.</th></tr></thead>
          <tbody>
            {centers.slice(0, 12).map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}><Link href={`/admin/centres/${o.id}`} style={{ color: "var(--primary)" }}>{o.name}</Link></td>
                <td className="muted">{o.city ?? "—"}</td>
                <td><span className={"badge " + (o.plan === "FREE" ? "badge-neutral" : "badge-positive")}>{o.plan}</span></td>
                <td className="tnum">{o._count.trainers}</td>
                <td className="tnum">{o._count.formations}</td>
                <td className="tnum">{o.upcomingSessions}</td>
                <td className="tnum">{o._count.beneficiaries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
