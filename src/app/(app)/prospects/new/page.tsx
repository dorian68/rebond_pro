import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { formationOptions } from "@/server/options";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { ProspectForm } from "../prospect-form";
import { createProspect } from "@/server/prospects-actions";

export default async function NewProspectPage() {
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "COMMERCIAL"].includes(ctx.role)) return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const formations = await formationOptions(ctx);
  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: "0 auto" }}>
      <Link href="/prospects" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Nouveau prospect" />
      <ProspectForm action={createProspect} formations={formations} submitLabel="Créer le prospect" />
    </div>
  );
}
