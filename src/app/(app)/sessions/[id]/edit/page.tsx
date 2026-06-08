import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/server/sessions";
import { formationOptions, trainerOptions, roomOptions } from "@/server/options";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { SessionForm } from "../../session-form";
import { updateSession } from "@/server/sessions-actions";
import { toDateInput } from "@/lib/utils";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role)) {
    return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  }
  const s = await getSession(ctx, id);
  if (!s) notFound();
  const [formations, trainers, rooms] = await Promise.all([formationOptions(ctx), trainerOptions(ctx), roomOptions(ctx)]);
  const action = updateSession.bind(null, id);

  return (
    <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Link href={`/sessions/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Modifier la session" subtitle={s.formation.title} />
      <SessionForm
        action={action}
        formations={formations}
        trainers={trainers}
        rooms={rooms}
        submitLabel="Enregistrer"
        cancelHref={`/sessions/${id}`}
        defaults={{
          formationId: s.formationId, trainerId: s.trainerId, roomId: s.roomId,
          startDate: toDateInput(s.startDate), endDate: toDateInput(s.endDate), slots: s.slots,
          capacity: s.capacity, price: s.pricePerLearner, breakEvenSeats: s.breakEvenSeats,
          status: s.status, trainerConfirmed: s.trainerConfirmed,
        }}
      />
    </div>
  );
}
