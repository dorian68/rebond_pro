"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;

// ── Réclamations ──────────────────────────────────────────────────
const complaintSchema = z.object({
  subject: z.string().min(2, "Sujet requis."),
  description: z.string().optional(),
});

export async function createComplaint(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = complaintSchema.safeParse({ subject: formData.get("subject"), description: formData.get("description") || undefined });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  await prisma.complaint.create({ data: { organizationId: ctx.organizationId, ...parsed.data } });
  revalidatePath("/qualite");
  return { ok: true };
}

export async function updateComplaintStatus(id: string, status: "OUVERTE" | "EN_COURS" | "RESOLUE"): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  await prisma.complaint.updateMany({ where: { id, organizationId: ctx.organizationId }, data: { status } });
  revalidatePath("/qualite");
}

// ── Actions correctives ──────────────────────────────────────────
const actionSchema = z.object({
  title: z.string().min(2, "Titre requis."),
  description: z.string().optional(),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function createImprovementAction(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = actionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    owner: formData.get("owner") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.improvementAction.create({
    data: { organizationId: ctx.organizationId, title: d.title, description: d.description, owner: d.owner, dueDate: d.dueDate ? new Date(d.dueDate) : null },
  });
  revalidatePath("/qualite");
  return { ok: true };
}

export async function updateImprovementStatus(id: string, status: "OUVERTE" | "EN_COURS" | "FERMEE"): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  await prisma.improvementAction.updateMany({ where: { id, organizationId: ctx.organizationId }, data: { status } });
  revalidatePath("/qualite");
}

// ── Feedbacks ────────────────────────────────────────────────────
const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
  formationTitle: z.string().optional(),
});

export async function createFeedback(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const parsed = feedbackSchema.safeParse({
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
    formationTitle: formData.get("formationTitle") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.feedback.create({ data: { organizationId: ctx.organizationId, rating: d.rating, comment: d.comment, formationTitle: d.formationTitle } });
  revalidatePath("/qualite");
  return { ok: true };
}
