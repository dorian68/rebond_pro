import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { trainerOptions } from "@/server/trainers";
import { AvailabilityBulkClient } from "./availability-bulk-client";

export const dynamic = "force-dynamic";

export default async function FormateursDisponibilitesPage() {
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role)) {
    return <p className="muted" style={{ padding: 40 }}>Vous n&apos;avez pas les droits pour modifier les disponibilités formateurs.</p>;
  }
  const trainers = await trainerOptions(ctx);

  return (
    <div className="fade-up" style={{ maxWidth: 980, margin: "0 auto" }}>
      <Link href="/formateurs" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Formateurs</Link>
      <PageHeader title="Disponibilités formateurs" subtitle="Saisie et import en lot des emplois du temps formateurs." />
      {trainers.length === 0 ? (
        <Card><EmptyState icon="presentation" title="Aucun formateur" text="Ajoutez d'abord des formateurs pour gérer leurs disponibilités." /></Card>
      ) : (
        <AvailabilityBulkClient trainers={trainers} />
      )}
    </div>
  );
}
