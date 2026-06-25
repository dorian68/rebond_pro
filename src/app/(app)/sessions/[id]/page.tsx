import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/server/sessions";
import { Card, PageHeader, SessionBadge, FillBar, Avatar } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatMoney, formatDateRange, clampPct } from "@/lib/utils";
import { SLOT_LABELS } from "@/lib/labels";
import { ConfirmTrainerButton, DeleteSessionButton } from "./session-actions";
import { StatusSelect, UnenrollButton, EnrollPanel } from "@/components/app/EnrollmentControls";
import { SessionModulePanel } from "./session-module-panel";
import { learnerOptions, trainerOptions } from "@/server/options";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  const s = await getSession(ctx, id);
  if (!s) notFound();
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);

  const now = new Date();
  const enrolled = s.enrollments.length;
  const enrolledIds = new Set(s.enrollments.map((e) => e.learnerId));
  const allLearners = canEdit ? await learnerOptions(ctx) : [];
  const availableLearners = allLearners.filter((l) => !enrolledIds.has(l.id));
  const orgTrainers = s.formation.modules.length > 0 ? await trainerOptions(ctx) : [];
  const assignmentByModule = new Map(s.moduleAssignments.map((a) => [a.moduleId, a.trainerId]));
  const moduleRows = s.formation.modules.map((m) => ({
    id: m.id,
    title: m.title,
    position: m.position,
    eligible: m.trainers.map((t) => t.trainer),
    assignedTrainerId: assignmentByModule.get(m.id) ?? null,
  }));
  const isFull = enrolled >= s.capacity;
  const fillRate = s.capacity > 0 ? clampPct((enrolled / s.capacity) * 100) : 0;
  const forecast = enrolled * s.pricePerLearner;
  const uiStatus = s.status === "OUVERTE" && s.endDate >= now && (enrolled < s.breakEvenSeats || !s.trainer || !s.trainerConfirmed) ? "RISQUE" : s.status;

  return (
    <div className="fade-up">
      <Link href="/sessions" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Sessions</Link>

      <PageHeader title={s.formation.title} subtitle={formatDateRange(s.startDate, s.endDate)}>
        <SessionBadge statut={uiStatus} />
        {canEdit && (
          <>
            <ConfirmTrainerButton id={s.id} confirmed={s.trainerConfirmed} hasTrainer={!!s.trainer} />
            <Link href={`/sessions/${s.id}/edit`} className="btn btn-secondary btn-sm"><Icon name="edit" size={15} /> Modifier</Link>
            <DeleteSessionButton id={s.id} />
          </>
        )}
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16 }}>
        <Card>
          <div className="spread" style={{ marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Apprenants inscrits ({enrolled}/{s.capacity})</h3>
            {canEdit && (
              isFull ? <span className="badge badge-primary">Session complète</span>
                : availableLearners.length > 0
                  ? <EnrollPanel sessionId={s.id} learners={availableLearners} />
                  : <Link href={`/apprenants/new?sessionId=${s.id}`} className="btn btn-secondary btn-sm"><Icon name="plus" size={15} /> Nouvel apprenant</Link>
            )}
          </div>
          {enrolled === 0 ? (
            <p className="muted-3" style={{ fontSize: 13 }}>Aucun apprenant inscrit pour le moment.</p>
          ) : (
            <table className="tbl">
              <thead><tr><th>Apprenant</th><th>Entreprise</th><th>Statut</th>{canEdit && <th></th>}</tr></thead>
              <tbody>
                {s.enrollments.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar size={28}>{(e.learner.firstName[0] + e.learner.lastName[0]).toUpperCase()}</Avatar>
                        <Link href={`/apprenants/${e.learner.id}`} style={{ fontWeight: 600 }}>{e.learner.firstName} {e.learner.lastName}</Link>
                      </div>
                    </td>
                    <td className="muted">{e.learner.company ?? "—"}</td>
                    <td>{canEdit ? <StatusSelect enrollmentId={e.id} status={e.status} /> : e.status}</td>
                    {canEdit && <td style={{ textAlign: "right" }}><UnenrollButton enrollmentId={e.id} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canEdit && !isFull && availableLearners.length > 0 && (
            <p className="muted-3" style={{ fontSize: 12, marginTop: 10 }}>Ou <Link href={`/apprenants/new?sessionId=${s.id}`} style={{ color: "var(--primary)", fontWeight: 700 }}>créer un nouvel apprenant</Link>.</p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Détails</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <Row label="Dates">{formatDateRange(s.startDate, s.endDate)}</Row>
            <Row label="Créneaux">{s.slots.map((sl) => SLOT_LABELS[sl]).join(", ") || "—"}</Row>
            <Row label="Formateur">{s.trainer ? `${s.trainer.firstName} ${s.trainer.lastName}${s.trainerConfirmed ? " ✓" : " (non confirmé)"}` : "Non assigné"}</Row>
            <Row label="Salle / Visio">{s.room ? s.room.name : "—"}</Row>
            <Row label="Capacité">{enrolled}/{s.capacity}</Row>
            <Row label="Seuil rentabilité">{s.breakEvenSeats} inscrits</Row>
            <Row label="Prix / apprenant">{formatMoney(s.pricePerLearner)}</Row>
            <Row label="CA prévisionnel">{formatMoney(forecast)}</Row>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>Remplissage</div>
              <FillBar value={fillRate} seuil={s.capacity > 0 ? Math.round((s.breakEvenSeats / s.capacity) * 100) : undefined} width={200} />
            </div>
          </div>
        </Card>
      </div>

      {moduleRows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SessionModulePanel sessionId={s.id} modules={moduleRows} trainers={orgTrainers} canEdit={canEdit} />
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="spread">
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
      <span className="tnum" style={{ fontSize: 13.5, fontWeight: 700, textAlign: "right" }}>{children}</span>
    </div>
  );
}
