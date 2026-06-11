import { requireTenant } from "@/lib/tenant";
import { getOrganizationSettings, getMembers, getDocumentTemplates } from "@/server/parametres";
import { getBillingState } from "@/server/billing";
import { PageHeader } from "@/components/ui/primitives";
import { ParametresClient } from "./parametres-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres — Le Bon Rebond Partenaires" };

export default async function ParametresPage() {
  const ctx = await requireTenant();
  const [org, members, templates, billing] = await Promise.all([
    getOrganizationSettings(ctx),
    getMembers(ctx),
    getDocumentTemplates(ctx),
    getBillingState(ctx),
  ]);

  if (!org) return <div>Organisation introuvable.</div>;

  return (
    <div className="fade-up">
      <PageHeader title="Paramètres" subtitle="Profil du centre, membres, abonnement et configuration." />
      <ParametresClient org={org} members={members} templates={templates} role={ctx.role} billing={billing} />
    </div>
  );
}
