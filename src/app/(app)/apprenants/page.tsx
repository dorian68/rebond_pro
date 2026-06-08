import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listLearners } from "@/server/learners";
import { PageHeader, EmptyState, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { LearnersExplorer } from "./learners-explorer";

export const dynamic = "force-dynamic";

export default async function ApprenantsPage() {
  const ctx = await requireTenant();
  const learners = await listLearners(ctx);
  const canEdit = ["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role);

  return (
    <div className="fade-up">
      <PageHeader title="Apprenants" subtitle="Vos inscrits, leur parcours et leurs documents.">
        {canEdit && (
          <Link href="/apprenants/new" className="btn btn-primary"><Icon name="plus" size={17} /> Ajouter un apprenant</Link>
        )}
      </PageHeader>

      {learners.length === 0 ? (
        <Card><EmptyState icon="grad" title="Aucun apprenant" text="Ajoutez vos apprenants ou importez-les depuis un fichier."
          action={canEdit ? <Link href="/apprenants/new" className="btn btn-primary"><Icon name="plus" size={16} /> Ajouter</Link> : undefined} /></Card>
      ) : (
        <LearnersExplorer learners={learners} canEdit={canEdit} />
      )}
    </div>
  );
}
