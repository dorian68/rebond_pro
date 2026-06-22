import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform";

export type MilestoneStatus = "planned" | "in_progress" | "blocked" | "done";
export type MilestonePriority = "low" | "medium" | "high";

export const MILESTONE_STATUSES: MilestoneStatus[] = ["planned", "in_progress", "blocked", "done"];
export const MILESTONE_PRIORITIES: MilestonePriority[] = ["low", "medium", "high"];

export type Milestone = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  priority: MilestonePriority;
  progress: number;
  deadline: string | null; // yyyy-mm-dd (vide si non renseignée)
  category: string | null;
  ownerName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  link: string | null;
  sortOrder: number;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoadmapStats = {
  total: number;
  planned: number;
  inProgress: number;
  blocked: number;
  done: number;
  overdue: number;
  avgProgress: number;
};

export type RoadmapData = { milestones: Milestone[]; stats: RoadmapStats };

function normalizeStatus(value: string): MilestoneStatus {
  return (MILESTONE_STATUSES as string[]).includes(value) ? (value as MilestoneStatus) : "planned";
}
function normalizePriority(value: string): MilestonePriority {
  return (MILESTONE_PRIORITIES as string[]).includes(value) ? (value as MilestonePriority) : "medium";
}
function toDateInput(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toMilestone(row: {
  id: string; title: string; description: string | null; status: string; priority: string; progress: number;
  deadline: Date | null; category: string | null; ownerName: string | null; contactName: string | null;
  contactEmail: string | null; contactPhone: string | null; link: string | null; sortOrder: number;
  createdByName: string | null; createdByEmail: string | null; createdAt: Date; updatedAt: Date;
}): Milestone {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    progress: Math.min(100, Math.max(0, row.progress)),
    deadline: toDateInput(row.deadline),
    category: row.category,
    ownerName: row.ownerName,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    link: row.link,
    sortOrder: row.sortOrder,
    createdByName: row.createdByName,
    createdByEmail: row.createdByEmail,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Roadmap plateforme partagée — réservée au super-admin. */
export async function getRoadmap(): Promise<RoadmapData> {
  await requirePlatformAdmin();
  const rows = await prisma.roadmapMilestone.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const milestones = rows.map(toMilestone);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const stats: RoadmapStats = {
    total: milestones.length,
    planned: milestones.filter((m) => m.status === "planned").length,
    inProgress: milestones.filter((m) => m.status === "in_progress").length,
    blocked: milestones.filter((m) => m.status === "blocked").length,
    done: milestones.filter((m) => m.status === "done").length,
    overdue: milestones.filter((m) => m.status !== "done" && m.deadline !== null && new Date(m.deadline) < startOfToday).length,
    avgProgress: milestones.length === 0 ? 0 : Math.round(milestones.reduce((sum, m) => sum + (m.status === "done" ? 100 : m.progress), 0) / milestones.length),
  };
  return { milestones, stats };
}
