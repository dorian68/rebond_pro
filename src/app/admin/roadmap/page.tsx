import { PageHeader } from "@/components/ui/primitives";
import { getRoadmap } from "@/server/roadmap";
import { RoadmapClient } from "./roadmap-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roadmap — Administration" };

export default async function AdminRoadmapPage() {
  const { milestones, stats } = await getRoadmap();
  return (
    <div className="fade-up">
      <PageHeader
        title="Roadmap"
        subtitle="Jalons partagés entre administrateurs plateforme. Suivi d'avancement, échéances et contacts."
      />
      <RoadmapClient milestones={milestones} stats={stats} />
    </div>
  );
}
