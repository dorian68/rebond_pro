import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getLearner } from "@/server/learners";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { LearnerForm } from "../../learner-form";
import { updateLearner } from "@/server/learners-actions";

export default async function EditLearnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role)) return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const l = await getLearner(ctx, id);
  if (!l) notFound();
  const action = updateLearner.bind(null, id);
  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href={`/apprenants/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Modifier l'apprenant" subtitle={`${l.firstName} ${l.lastName}`} />
      <LearnerForm action={action} submitLabel="Enregistrer" cancelHref={`/apprenants/${id}`}
        defaults={{ firstName: l.firstName, lastName: l.lastName, email: l.email, phone: l.phone, company: l.company }} />
    </div>
  );
}
