import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getFormation } from "@/server/formations";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { FormationForm } from "../../formation-form";
import { updateFormation } from "@/server/formations-actions";
import { trainerOptions } from "@/server/trainers";

export default async function EditFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return <p className="muted" style={{ padding: 40 }}>Vous n&apos;avez pas les droits pour modifier une formation.</p>;
  }
  const f = await getFormation(ctx, id);
  if (!f) notFound();
  const trainers = await trainerOptions(ctx);

  const action = updateFormation.bind(null, id);

  return (
    <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Link href={`/formations/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Modifier la formation" subtitle={f.title} />
      <FormationForm
        action={action}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/formations/${id}`}
        defaults={{
          title: f.title, category: f.category, shortDescription: f.shortDescription, longDescription: f.longDescription,
          objectives: f.objectives, targetAudience: f.targetAudience, prerequisites: f.prerequisites, program: f.program,
          durationDays: f.durationDays, durationHours: f.durationHours, price: f.price, modality: f.modality, level: f.level, status: f.status, color: f.color,
          modules: f.modules.map((module) => ({
            id: module.id,
            title: module.title,
            description: module.description,
            durationDays: module.durationDays,
            durationHours: module.durationHours,
            trainerIds: module.trainers.map((item) => item.trainerId),
          })),
        }}
        trainers={trainers}
      />
    </div>
  );
}
