"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform";
import { MILESTONE_PRIORITIES, MILESTONE_STATUSES } from "@/server/roadmap";

export type RoadmapActionResult = { ok: boolean; error?: string; id?: string };

const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200, "Titre trop long."),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(MILESTONE_STATUSES as [string, ...string[]]).default("planned"),
  priority: z.enum(MILESTONE_PRIORITIES as [string, ...string[]]).default("medium"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  deadline: z.string().trim().optional(),
  category: z.string().trim().max(80).optional(),
  ownerName: z.string().trim().max(120).optional(),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().max(160).optional(),
  contactPhone: z.string().trim().max(60).optional(),
  link: z.string().trim().max(500).optional(),
});

function nullify(value?: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function parseDeadline(value?: string): Date | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readForm(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "planned"),
    priority: String(formData.get("priority") ?? "medium"),
    progress: String(formData.get("progress") ?? "0"),
    deadline: String(formData.get("deadline") ?? ""),
    category: String(formData.get("category") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    link: String(formData.get("link") ?? ""),
  };
}

function dataFromParsed(parsed: z.infer<typeof milestoneSchema>) {
  return {
    title: parsed.title.trim(),
    description: nullify(parsed.description),
    status: parsed.status,
    priority: parsed.priority,
    // Un jalon terminé est forcément à 100 %.
    progress: parsed.status === "done" ? 100 : parsed.progress,
    deadline: parseDeadline(parsed.deadline),
    category: nullify(parsed.category),
    ownerName: nullify(parsed.ownerName),
    contactName: nullify(parsed.contactName),
    contactEmail: nullify(parsed.contactEmail),
    contactPhone: nullify(parsed.contactPhone),
    link: nullify(parsed.link),
  };
}

export async function createMilestone(_prev: RoadmapActionResult | undefined, formData: FormData): Promise<RoadmapActionResult> {
  const admin = await requirePlatformAdmin();
  const parsed = milestoneSchema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  try {
    const max = await prisma.roadmapMilestone.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.roadmapMilestone.create({
      data: {
        ...dataFromParsed(parsed.data),
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        createdByEmail: admin.email,
        createdByName: admin.name,
      },
      select: { id: true },
    });
    revalidatePath("/admin/roadmap");
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Création impossible." };
  }
}

export async function updateMilestone(id: string, _prev: RoadmapActionResult | undefined, formData: FormData): Promise<RoadmapActionResult> {
  await requirePlatformAdmin();
  if (!id) return { ok: false, error: "Jalon introuvable." };
  const parsed = milestoneSchema.safeParse(readForm(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  try {
    await prisma.roadmapMilestone.update({ where: { id }, data: dataFromParsed(parsed.data) });
    revalidatePath("/admin/roadmap");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour impossible." };
  }
}

export async function deleteMilestone(id: string): Promise<RoadmapActionResult> {
  await requirePlatformAdmin();
  if (!id) return { ok: false, error: "Jalon introuvable." };
  try {
    await prisma.roadmapMilestone.delete({ where: { id } });
    revalidatePath("/admin/roadmap");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Suppression impossible." };
  }
}

/** Changement rapide de statut depuis une carte (sans rouvrir le formulaire). */
export async function setMilestoneStatus(id: string, status: string): Promise<RoadmapActionResult> {
  await requirePlatformAdmin();
  if (!(MILESTONE_STATUSES as string[]).includes(status)) return { ok: false, error: "Statut invalide." };
  try {
    await prisma.roadmapMilestone.update({
      where: { id },
      data: { status, ...(status === "done" ? { progress: 100 } : {}) },
    });
    revalidatePath("/admin/roadmap");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Mise à jour impossible." };
  }
}

/** Réordonne un jalon en échangeant son sortOrder avec son voisin. */
export async function moveMilestone(id: string, direction: "up" | "down"): Promise<RoadmapActionResult> {
  await requirePlatformAdmin();
  try {
    const ordered = await prisma.roadmapMilestone.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const index = ordered.findIndex((m) => m.id === id);
    if (index === -1) return { ok: false, error: "Jalon introuvable." };
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= ordered.length) return { ok: true };
    const current = ordered[index];
    const neighbor = ordered[neighborIndex];
    await prisma.$transaction([
      prisma.roadmapMilestone.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
      prisma.roadmapMilestone.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
    ]);
    revalidatePath("/admin/roadmap");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Réorganisation impossible." };
  }
}
