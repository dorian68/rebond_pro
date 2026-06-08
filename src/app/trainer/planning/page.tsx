import Link from "next/link";
import { getTrainerContext, getMyPlanning } from "@/server/trainer-self";
import { PageHeader, Card, EmptyState, SessionBadge } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { formatDateRange } from "@/lib/utils";
import { MODALITY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

function Row({ s }: { s: { id: string; startDate: Date; endDate: Date; status: string; formation: { title: string; color: string | null }; room: { name: string; type: string } | null; _count: { enrollments: number } } }) {
  return (
    <Link href={`/trainer/sessions/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--border-2)", color: "inherit" }}>
      <span style={{ width: 4, height: 38, borderRadius: 4, background: s.formation.color ?? "#5850ec", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.formation.title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
          {formatDateRange(s.startDate, s.endDate)} · {s.room ? `${s.room.name}` : MODALITY_LABELS.DISTANCIEL} · {s._count.enrollments} inscrit{s._count.enrollments > 1 ? "s" : ""}
        </div>
      </div>
      <SessionBadge statut={s.status} />
    </Link>
  );
}

export default async function TrainerPlanningPage() {
  const { ctx, trainer } = await getTrainerContext();
  if (!trainer) {
    return <div className="fade-up"><PageHeader title="Mon planning" /><Card><EmptyState icon="user-x" title="Compte non rattaché" text="Contactez votre centre de formation." /></Card></div>;
  }
  const { upcoming, past } = await getMyPlanning(trainer.id, ctx.organizationId);

  return (
    <div className="fade-up">
      <PageHeader title="Mon planning" subtitle="Vos interventions à venir et passées.">
        <a href="/api/trainer/planning.ics" className="btn btn-secondary"><Icon name="download" size={16} /> Exporter (.ics)</a>
      </PageHeader>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>À venir ({upcoming.length})</h3>
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar" title="Aucune intervention à venir" text="Vos prochaines affectations apparaîtront ici." />
        ) : upcoming.map((s) => <Row key={s.id} s={s} />)}
      </Card>

      {past.length > 0 && (
        <Card>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Passées</h3>
          {past.map((s) => <Row key={s.id} s={s} />)}
        </Card>
      )}
    </div>
  );
}
