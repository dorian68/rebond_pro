import "@xyflow/react/dist/style.css";

import { notFound } from "next/navigation";
import { getRoadmap2Data, Roadmap2NotFoundError } from "@/server/roadmap2";
import { Roadmap2Client } from "./roadmap2-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Roadmap 2 — Administration",
  robots: { index: false, follow: false },
};

export default async function AdminRoadmap2Page({ searchParams }: { searchParams: Promise<{ roadmap?: string; drive?: string }> }) {
  const { roadmap, drive } = await searchParams;
  let data;
  try {
    data = await getRoadmap2Data(roadmap);
  } catch (error) {
    if (error instanceof Roadmap2NotFoundError) notFound();
    throw error;
  }
  return <Roadmap2Client key={data.workspace.key} initialData={data} openDriveOnLoad={drive === "setup"} workspaceExplicit={Boolean(roadmap)} />;
}
