import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getLearner } from "@/server/learners";
import { Card, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange } from "@/lib/utils";
import { StatusSelect, UnenrollButton } from "@/components/app/EnrollmentControls";
import { DeleteLearnerButton } from "./delete-learner";

export const dynamic = "force-dynamic";

export default async function LearnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const l = await getLearner(ctx, id);
  if (!l) notFound();
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);

  return (
    <div className="fade-up">
      <Link href="/apprenants" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Apprenants</Link>

      <div className="spread" style={{ marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar size={52}>{(l.firstName[0] + l.lastName[0]).toUpperCase()}</Avatar>
          <div>
            <h1 style={{ fontSize: 23, fontWeight: 800 }}>{l.firstName} {l.lastName}</h1>
            <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>{l.company ?? "—"}{l.email ? ` · ${l.email}` : ""}{l.phone ? ` · ${l.phone}` : ""}</p>
          </div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href={`/apprenants/${l.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Modifier</Link>
            <DeleteLearnerButton id={l.id} />
          </div>
        )}
      </div>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>Parcours de formation ({l.enrollments.length})</h3>
        {l.enrollments.length === 0 ? (
          <p className="muted-3" style={{ fontSize: 13 }}>Aucune inscription. Inscrivez cet apprenant depuis une session.</p>
        ) : (
          <table className="tbl">
            <thead><tr><th>Formation</th><th>Dates</th><th>Statut</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {l.enrollments.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}><Link href={`/sessions/${e.session.id}`} style={{ color: "var(--primary-700)" }}>{e.session.formation.title}</Link></td>
                  <td className="muted">{formatDateRange(e.session.startDate, e.session.endDate)}</td>
                  <td>{canEdit ? <StatusSelect enrollmentId={e.id} status={e.status} /> : e.status}</td>
                  {canEdit && <td style={{ textAlign: "right" }}><UnenrollButton enrollmentId={e.id} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
