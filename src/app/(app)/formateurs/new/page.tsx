import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { formationOptions } from "@/server/options";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { TrainerForm } from "../trainer-form";
import { createTrainer } from "@/server/trainers-actions";

export default async function NewTrainerPage() {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "ADMIN") return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const formations = await formationOptions(ctx);
  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href="/formateurs" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Ajouter un formateur" />
      <TrainerForm action={createTrainer} formations={formations} submitLabel="Créer le formateur" />
    </div>
  );
}
