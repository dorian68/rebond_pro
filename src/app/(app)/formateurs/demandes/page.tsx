import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listChangeRequests } from "@/server/change-requests";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { DemandesClient } from "./demandes-client";

export const dynamic = "force-dynamic";

export default async function FormateursDemandesPage() {
  const ctx = await requireTenant();
  const canRespond = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);
  const requests = await listChangeRequests(ctx);

  return (
    <div className="fade-up">
      <PageHeader title="Demandes des formateurs" subtitle="Traitez les demandes de modification de disponibilité ou d'affectation.">
        <Link href="/formateurs" className="btn btn-secondary"><Icon name="chevron-left" size={16} /> Formateurs</Link>
      </PageHeader>

      {requests.length === 0 ? (
        <Card><EmptyState icon="message" title="Aucune demande" text="Les demandes de vos formateurs apparaîtront ici." /></Card>
      ) : (
        <DemandesClient
          canRespond={canRespond}
          requests={requests.map((r) => ({
            id: r.id, requestType: r.requestType, reason: r.reason, status: r.status, urgency: r.urgency,
            createdAt: r.createdAt.toISOString(), centerResponse: r.centerResponse,
            proposedDate: r.proposedDate?.toISOString() ?? null, proposedSlot: r.proposedSlot,
            trainer: { id: r.trainer.id, name: `${r.trainer.firstName} ${r.trainer.lastName}`, initials: r.trainer.initials, color: r.trainer.color, photoUrl: r.trainer.photoUrl },
          }))}
        />
      )}
    </div>
  );
}
