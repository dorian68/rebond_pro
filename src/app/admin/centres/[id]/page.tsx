import Link from "next/link";
import { notFound } from "next/navigation";
import { getCenterDetail } from "@/server/platform";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney } from "@/lib/utils";
import { MarketplaceModerationButtons, MarketplaceStatusBadge } from "../../marketplace-actions";

export const dynamic = "force-dynamic";

export default async function AdminCenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getCenterDetail(id);
  if (!o) notFound();

  return (
    <div className="fade-up">
      <Link href="/admin/centres" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Centres</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={56} color="#2469a6">{o.name.slice(0, 2).toUpperCase()}</Avatar>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 23, fontWeight: 800 }}>{o.name}</h1>
              <MarketplaceStatusBadge status={o.marketplaceStatus} />
            </div>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>{o.city ?? "—"} · Plan <strong>{o.plan}</strong> · {o.billingStatus ?? "—"}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <MarketplaceModerationButtons orgId={o.id} status={o.marketplaceStatus} />
          {o.marketplaceStatus === "APPROVED" && <Link href="/marketplace#centres" target="_blank" className="btn btn-secondary btn-sm"><Icon name="layers" size={15} /> Voir dans la marketplace</Link>}
          {o.marketplaceStatus === "APPROVED" && <Link href={`/${o.slug}`} target="_blank" className="btn btn-secondary btn-sm"><Icon name="globe" size={15} /> Page publique</Link>}
        </div>
      </div>

      {o.marketplaceStatus === "REJECTED" && o.marketplaceRejectionReason && (
        <div className="badge badge-danger" style={{ marginBottom: 16, padding: "8px 12px", display: "block", width: "fit-content" }}>
          Refusé — motif : {o.marketplaceRejectionReason}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        {[
          { l: "Formateurs", v: o.trainers.length, i: "presentation" },
          { l: "Formations", v: o.formations.length, i: "book" },
          { l: "Sessions à venir", v: o._count.sessions, i: "calendar" },
          { l: "Bénéficiaires", v: o.beneficiaries.length, i: "smile" },
        ].map((k) => (
          <div key={k.l} style={{ padding: "14px 16px", border: "1px solid var(--border)", borderRadius: 14, background: "#fff" }}>
            <Icon name={k.i} size={17} style={{ color: "var(--primary)" }} />
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600 }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Formateurs</h3>
          {o.trainers.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucun.</p> : (
            <div style={{ display: "grid", gap: 6 }}>
              {o.trainers.map((t) => (
                <div key={t.id} className="spread" style={{ padding: "8px 10px", borderRadius: 9, background: "var(--surface-3)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.firstName} {t.lastName}</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {t.userId && <span className="badge badge-positive">Portail</span>}
                    {!t.active && <span className="badge badge-neutral">Inactif</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Bénéficiaires (bilan)</h3>
          {o.beneficiaries.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucun.</p> : (
            <div style={{ display: "grid", gap: 6 }}>
              {o.beneficiaries.map((b) => (
                <div key={b.id} className="spread" style={{ padding: "8px 10px", borderRadius: 9, background: "var(--surface-3)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{b.firstName} {b.lastName}</span>
                  <span className="badge badge-neutral">{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card style={{ gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>Formations ({o.formations.length})</h3>
          {o.formations.length === 0 ? <p className="muted-3" style={{ fontSize: 13 }}>Aucune.</p> : (
            <table className="tbl">
              <thead><tr><th>Titre</th><th>Statut</th><th>Publique</th><th>Prix</th></tr></thead>
              <tbody>
                {o.formations.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.title}</td>
                    <td className="muted">{f.status}</td>
                    <td>{f.isPublic ? "Oui" : "Non"}</td>
                    <td className="tnum">{formatMoney(f.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
