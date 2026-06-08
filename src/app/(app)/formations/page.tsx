import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listFormations } from "@/server/formations";
import { PageHeader, EmptyState, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { FormationsExplorer } from "./formations-explorer";

export const dynamic = "force-dynamic";

export default async function FormationsPage() {
  const ctx = await requireTenant();
  const formations = await listFormations(ctx);
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN";

  return (
    <div className="fade-up">
      <PageHeader title="Formations" subtitle="Votre catalogue de formations et leur performance.">
        {canEdit && (
          <Link href="/formations/new" className="btn btn-primary">
            <Icon name="plus" size={17} /> Créer une formation
          </Link>
        )}
      </PageHeader>

      {formations.length === 0 ? (
        <Card>
          <EmptyState
            icon="book"
            title="Aucune formation"
            text="Créez votre première formation pour commencer à planifier des sessions."
            action={canEdit ? <Link href="/formations/new" className="btn btn-primary"><Icon name="plus" size={16} /> Créer une formation</Link> : undefined}
          />
        </Card>
      ) : (
        <FormationsExplorer formations={formations} />
      )}
    </div>
  );
}
