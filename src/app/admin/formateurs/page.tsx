import Link from "next/link";
import { listAllTrainers } from "@/server/platform";
import { PageHeader, Card } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminFormateursPage() {
  const trainers = await listAllTrainers();
  return (
    <div className="fade-up">
      <PageHeader title="Formateurs du réseau" subtitle={`${trainers.length} formateur${trainers.length > 1 ? "s" : ""} sur l'ensemble des centres.`} />
      <Card>
        <table className="tbl">
          <thead><tr><th>Formateur</th><th>Centre</th><th>Spécialités</th><th>Sessions</th><th>Formations</th><th>Portail</th></tr></thead>
          <tbody>
            {trainers.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.firstName} {t.lastName}{!t.active && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Inactif</span>}</td>
                <td><Link href={`/admin/centres/${t.organization.id}`} style={{ color: "var(--primary)" }}>{t.organization.name}</Link></td>
                <td className="muted">{t.specialities.join(", ") || "—"}</td>
                <td className="tnum">{t._count.sessions}</td>
                <td className="tnum">{t._count.formations}</td>
                <td>{t.userId ? <span className="badge badge-positive">Activé</span> : <span className="badge badge-neutral">Non lié</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
