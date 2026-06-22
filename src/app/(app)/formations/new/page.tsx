import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { FormationForm } from "../formation-form";
import { createFormation } from "@/server/formations-actions";
import { trainerOptions } from "@/server/trainers";

export default async function NewFormationPage() {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") {
    return <p className="muted" style={{ padding: 40 }}>Vous n&apos;avez pas les droits pour créer une formation.</p>;
  }
  const trainers = await trainerOptions(ctx);
  return (
    <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Link href="/formations" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Créer une formation" subtitle="Ajoutez une nouvelle offre à votre catalogue." />
      <FormationForm action={createFormation} submitLabel="Créer la formation" trainers={trainers} />
    </div>
  );
}
