import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getTrainer } from "@/server/trainers";
import { formationOptions } from "@/server/options";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { TrainerForm } from "../../trainer-form";
import { updateTrainer } from "@/server/trainers-actions";

export default async function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const t = await getTrainer(ctx, id);
  if (!t) notFound();
  const formations = await formationOptions(ctx);
  const action = updateTrainer.bind(null, id);
  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href={`/formateurs/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Modifier le formateur" subtitle={`${t.firstName} ${t.lastName}`} />
      <TrainerForm
        action={action} formations={formations} submitLabel="Enregistrer" cancelHref={`/formateurs/${id}`} trainerId={id}
        defaults={{ firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone, specialities: t.specialities, bio: t.bio, color: t.color, active: t.active, yearsExperience: t.yearsExperience, photoUrl: t.photoUrl, formationIds: t.formations.map((f) => f.formationId) }}
      />
    </div>
  );
}
