import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { formationOptions, trainerOptions, roomOptions } from "@/server/options";
import { PageHeader, Card, EmptyState } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { SessionForm } from "../session-form";
import { createSession } from "@/server/sessions-actions";

export default async function NewSessionPage({ searchParams }: { searchParams: Promise<{ formationId?: string; start?: string; end?: string; trainerId?: string; roomId?: string }> }) {
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role)) {
    return <p className="muted" style={{ padding: 40 }}>Vous n&apos;avez pas les droits pour créer une session.</p>;
  }
  const { formationId, start, end, trainerId, roomId } = await searchParams;
  const [formations, trainers, rooms] = await Promise.all([formationOptions(ctx), trainerOptions(ctx), roomOptions(ctx)]);

  return (
    <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto" }}>
      <Link href="/sessions" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Nouvelle session" subtitle="Programmez une occurrence d'une de vos formations." />
      {formations.length === 0 ? (
        <Card>
          <EmptyState icon="book" title="Aucune formation" text="Créez d'abord une formation pour pouvoir programmer une session."
            action={<Link href="/formations/new" className="btn btn-primary"><Icon name="plus" size={16} /> Créer une formation</Link>} />
        </Card>
      ) : (
        <SessionForm action={createSession} formations={formations} trainers={trainers} rooms={rooms} defaults={{ formationId, startDate: start, endDate: end, trainerId, roomId, trainerConfirmed: !!trainerId }} />
      )}
    </div>
  );
}
