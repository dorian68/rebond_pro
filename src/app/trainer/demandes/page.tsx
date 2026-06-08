import { getTrainerContext, getMyChangeRequests, getMyPlanning } from "@/server/trainer-self";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { ChangeRequestClient } from "./change-request-client";

export const dynamic = "force-dynamic";

export default async function TrainerDemandesPage() {
  const { ctx, trainer } = await getTrainerContext();
  if (!trainer) {
    return <div className="fade-up"><PageHeader title="Mes demandes" /><Card><EmptyState icon="user-x" title="Compte non rattaché" text="Contactez votre centre de formation." /></Card></div>;
  }
  const [requests, planning] = await Promise.all([
    getMyChangeRequests(trainer.id),
    getMyPlanning(trainer.id, ctx.organizationId),
  ]);
  const sessions = planning.upcoming.map((s) => ({ id: s.id, label: `${s.formation.title} · ${s.startDate.toLocaleDateString("fr-FR")}` }));

  return (
    <div className="fade-up">
      <PageHeader title="Mes demandes de modification" subtitle="Signalez un changement de disponibilité, un conflit ou proposez une autre date." />
      <ChangeRequestClient requests={requests.map((r) => ({ id: r.id, requestType: r.requestType, reason: r.reason, status: r.status, urgency: r.urgency, createdAt: r.createdAt.toISOString(), centerResponse: r.centerResponse, proposedDate: r.proposedDate?.toISOString() ?? null }))} sessions={sessions} />
    </div>
  );
}
