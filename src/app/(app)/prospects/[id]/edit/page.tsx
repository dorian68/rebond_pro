import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { getProspect } from "@/server/prospects";
import { formationOptions } from "@/server/options";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ProspectForm } from "../../prospect-form";
import { updateProspect } from "@/server/prospects-actions";
import { toDateInput } from "@/lib/utils";

export default async function EditProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "COMMERCIAL"].includes(ctx.role)) return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const p = await getProspect(ctx, id);
  if (!p) notFound();
  const formations = await formationOptions(ctx);
  const action = updateProspect.bind(null, id);
  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href={`/prospects/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Modifier le prospect" subtitle={p.name} />
      <ProspectForm action={action} formations={formations} submitLabel="Enregistrer" cancelHref={`/prospects/${id}`}
        defaults={{ name: p.name, contactName: p.contactName, type: p.type, email: p.email, phone: p.phone, formationOfInterestId: p.formationOfInterestId, source: p.source, stage: p.stage, potentialAmount: p.potentialAmount, nextAction: p.nextAction, nextFollowUpDate: toDateInput(p.nextFollowUpDate), isHot: p.isHot, notes: p.notes }} />
    </div>
  );
}
