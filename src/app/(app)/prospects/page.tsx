import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listProspects } from "@/server/prospects";
import { PageHeader, EmptyState, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { KanbanBoard } from "./kanban-board";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const ctx = await requireTenant();
  const prospects = await listProspects(ctx);
  const canEdit = ["OWNER", "ADMIN", "COMMERCIAL"].includes(ctx.role);

  const active = prospects.filter((p) => !["GAGNE", "PERDU"].includes(p.stage));
  const pipelineValue = active.reduce((a, p) => a + p.potentialAmount, 0);

  return (
    <div className="fade-up">
      <PageHeader title="Prospects" subtitle={`Pipeline commercial · ${active.length} actifs · ${formatMoney(pipelineValue)} potentiels`}>
        {canEdit && <Link href="/prospects/new" className="btn btn-primary"><Icon name="plus" size={17} /> Nouveau prospect</Link>}
      </PageHeader>

      {prospects.length === 0 ? (
        <Card><EmptyState icon="target" title="Aucun prospect" text="Ajoutez vos prospects pour suivre votre pipeline commercial."
          action={canEdit ? <Link href="/prospects/new" className="btn btn-primary"><Icon name="plus" size={16} /> Nouveau prospect</Link> : undefined} /></Card>
      ) : (
        <KanbanBoard prospects={prospects} />
      )}
    </div>
  );
}
