import Link from "next/link";
import { listAllBeneficiaries } from "@/server/platform";
import { PageHeader, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { active: "badge-positive", completed: "badge-neutral", archived: "badge-neutral" };

export default async function AdminBeneficiairesPage() {
  const list = await listAllBeneficiaries();
  return (
    <div className="fade-up">
      <PageHeader title="Bénéficiaires (bilan de compétences)" subtitle={`${list.length} bénéficiaire${list.length > 1 ? "s" : ""} accompagné${list.length > 1 ? "s" : ""} dans le réseau.`} />
      <Card>
        <table className="tbl">
          <thead><tr><th>Bénéficiaire</th><th>Email</th><th>Centre accompagnateur</th><th>Statut</th><th>Progression</th><th>Formations suivies</th></tr></thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id}>
                <td style={{ fontWeight: 600 }}>{b.firstName} {b.lastName}</td>
                <td className="muted">{b.email ?? "—"}</td>
                <td><Link href={`/admin/centres/${b.organization.id}`} style={{ color: "var(--primary)" }}>{b.organization.name}</Link></td>
                <td><span className={"badge " + (STATUS[b.status] ?? "badge-neutral")}>{b.status}</span></td>
                <td style={{ minWidth: 120 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: "var(--surface-3)", overflow: "hidden" }}><div style={{ height: "100%", width: `${b.progress}%`, background: "linear-gradient(90deg,#2f9488,#2469a6)" }} /></div>
                    <span className="tnum" style={{ fontSize: 12 }}>{b.progress}%</span>
                  </div>
                </td>
                <td className="tnum">{b._count.interests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
