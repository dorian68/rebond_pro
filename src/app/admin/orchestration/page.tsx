import "@xyflow/react/dist/style.css";

import { demoSnapshot } from "@/features/orchestration";
import { requirePlatformAdmin } from "@/lib/platform";
import { createOrchestrationUiModel } from "./orchestration-adapter";
import { OrchestrationClient } from "./orchestration-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Orchestration des parcours — Administration",
  description: "Studio de démonstration du Pathway Engine Le Bon Rebond.",
  robots: { index: false, follow: false },
};

export default async function AdminOrchestrationPage() {
  await requirePlatformAdmin();
  const model = createOrchestrationUiModel(demoSnapshot);

  return <OrchestrationClient initialModel={model} />;
}
