import Link from "next/link";
import { listAllCenters } from "@/server/platform";
import { PageHeader, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function AdminCentresPage() {
  const centers = await listAllCenters();
  return (
    <div className="fade-up">
      <PageHeader title="Centres de formation" subtitle={`${centers.length} centre${centers.length > 1 ? "s" : ""} dans le réseau.`} />
      <Card>
        <table className="tbl">
          <thead><tr><th>Centre</th><th>Ville</th><th>Plan</th><th>Statut facturation</th><th>Marketplace</th><th>Formateurs</th><th>Formations</th><th>Sessions</th><th>Bénéf.</th><th></th></tr></thead>
          <tbody>
            {centers.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600 }}>{o.name}</td>
                <td className="muted">{o.city ?? "—"}</td>
                <td><span className={"badge " + (o.plan === "FREE" ? "badge-neutral" : "badge-positive")}>{o.plan}</span></td>
                <td className="muted">{o.billingStatus ?? "—"}</td>
                <td>
                  {o.marketplaceStatus === "APPROVED" ? <span className="badge badge-positive">Validé</span> : o.marketplaceStatus === "REJECTED" ? <span className="badge badge-danger">Refusé</span> : <span className="badge badge-warn">À valider</span>}
                </td>
                <td className="tnum">{o._count.trainers}</td>
                <td className="tnum">{o._count.formations}</td>
                <td className="tnum">{o.upcomingSessions}</td>
                <td className="tnum">{o._count.beneficiaries}</td>
                <td><Link href={`/admin/centres/${o.id}`} className="btn btn-ghost btn-sm"><Icon name="arrow-up-right" size={15} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
