import { requireTenant } from "@/lib/tenant";
import { formationOptions } from "@/server/options";
import { isAiEnabled } from "@/lib/ai";
import { PageHeader } from "@/components/ui/primitives";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const ctx = await requireTenant();
  const formations = await formationOptions(ctx);
  return (
    <div className="fade-up">
      <PageHeader title="Assistant IA" subtitle="Votre copilote de pilotage et de développement commercial." />
      <AssistantClient aiEnabled={isAiEnabled()} firstFormation={formations[0] ? { id: formations[0].id, title: formations[0].title } : null} userName={ctx.name?.split(" ")[0] ?? null} />
    </div>
  );
}
