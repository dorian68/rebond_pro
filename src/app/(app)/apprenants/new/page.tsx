import Link from "next/link";
import { requireTenant } from "@/lib/tenant";
import { enrollableSessions } from "@/server/learners";
import { PageHeader } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { LearnerForm } from "../learner-form";
import { createLearner } from "@/server/learners-actions";

export default async function NewLearnerPage({ searchParams }: { searchParams: Promise<{ sessionId?: string }> }) {
  const ctx = await requireTenant();
  if (!["OWNER", "ADMIN", "ASSISTANT"].includes(ctx.role)) return <p className="muted" style={{ padding: 40 }}>Droits insuffisants.</p>;
  const { sessionId } = await searchParams;
  const sessions = await enrollableSessions(ctx);

  return (
    <div className="fade-up" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href="/apprenants" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={15} /> Retour</Link>
      <PageHeader title="Ajouter un apprenant" />
      <LearnerForm action={createLearner} submitLabel="Créer l'apprenant" enrollSessions={sessions} presetSessionId={sessionId} />
    </div>
  );
}
