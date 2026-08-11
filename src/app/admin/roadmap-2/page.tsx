import "@xyflow/react/dist/style.css";

import { getRoadmap2Data } from "@/server/roadmap2";
import { Roadmap2Client } from "./roadmap2-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Roadmap 2 — Administration",
  robots: { index: false, follow: false },
};

export default async function AdminRoadmap2Page() {
  const data = await getRoadmap2Data();
  return <Roadmap2Client initialData={data} />;
}
