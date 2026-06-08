import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { listSessions } from "@/server/sessions";
import { PageHeader, EmptyState, Card } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { SessionsExplorer } from "./sessions-explorer";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const ctx = await requireTenant();
  const sessions = await listSessions(ctx);
  const canEdit = ctx.role === "OWNER" || ctx.role === "ADMIN" || ctx.role === "ASSISTANT";

  return (
    <div className="fade-up">
      <PageHeader title="Sessions" subtitle="Les occurrences concrètes de vos formations.">
        {canEdit && <Link href="/sessions/new" className="btn btn-primary"><Icon name="plus" size={17} /> Nouvelle session</Link>}
      </PageHeader>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState icon="calendar" title="Aucune session" text="Programmez votre première session de formation."
            action={canEdit ? <Link href="/sessions/new" className="btn btn-primary"><Icon name="plus" size={16} /> Nouvelle session</Link> : undefined} />
        </Card>
      ) : (
        <SessionsExplorer sessions={sessions} />
      )}
    </div>
  );
}
