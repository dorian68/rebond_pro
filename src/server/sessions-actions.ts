"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import type { FormActionState } from "@/server/formations-actions";
import { findSessionSchedulingConflicts } from "@/server/scheduling-constraints";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT"] as const;
const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"] as const;

const sessionSchema = z.object({
  formationId: z.string().min(1, "Choisissez une formation."),
  trainerId: z.string().optional(),
  roomId: z.string().optional(),
  startDate: z.string().min(1, "Date de début requise."),
  endDate: z.string().min(1, "Date de fin requise."),
  capacity: z.coerce.number().int().min(1, "Capacité invalide."),
  priceEuros: z.coerce.number().min(0),
  breakEvenSeats: z.coerce.number().int().min(0),
  status: z.enum(["BROUILLON", "OUVERTE", "COMPLETE", "TERMINEE", "ANNULEE"]),
  trainerConfirmed: z.coerce.boolean().optional(),
});

function parse(formData: FormData) {
  const slots = SLOTS.filter((s) => formData.get(`slot_${s}`) === "on");
  const parsed = sessionSchema.safeParse({
    formationId: formData.get("formationId"),
    trainerId: formData.get("trainerId") || undefined,
    roomId: formData.get("roomId") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    capacity: formData.get("capacity"),
    priceEuros: formData.get("priceEuros") ?? 0,
    breakEvenSeats: formData.get("breakEvenSeats") ?? 0,
    status: formData.get("status"),
    trainerConfirmed: formData.get("trainerConfirmed") === "on",
  });
  return { parsed, slots: slots.length ? slots : (["JOURNEE"] as typeof SLOTS[number][]) };
}

/** Affecte (ou retire avec trainerId=null) un formateur à un module pour une session précise. */
export async function setSessionModuleAssignment(sessionId: string, moduleId: string, trainerId: string | null): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const session = await prisma.session.findFirst({ where: { id: sessionId, organizationId: ctx.organizationId, deletedAt: null }, select: { id: true, formationId: true } });
  if (!session) return { ok: false, error: "Session introuvable." };
  const moduleRow = await prisma.formationModule.findFirst({ where: { id: moduleId, formationId: session.formationId, organizationId: ctx.organizationId }, select: { id: true } });
  if (!moduleRow) return { ok: false, error: "Module introuvable pour cette formation." };
  let validTrainerId: string | null = null;
  if (trainerId) {
    const trainer = await prisma.trainer.findFirst({ where: { id: trainerId, organizationId: ctx.organizationId, deletedAt: null }, select: { id: true } });
    if (!trainer) return { ok: false, error: "Formateur introuvable." };
    validTrainerId = trainer.id;
  }
  await prisma.sessionModuleAssignment.upsert({
    where: { sessionId_moduleId: { sessionId, moduleId } },
    create: { organizationId: ctx.organizationId, sessionId, moduleId, trainerId: validTrainerId },
    update: { trainerId: validTrainerId },
  });
  revalidatePath(`/sessions/${sessionId}`);
  return { ok: true };
}

export async function createSession(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const { enforceQuota } = await import("@/server/quota");
  try { await enforceQuota(ctx, "sessions"); } catch (e) { return { error: e instanceof Error ? e.message : "Quota atteint." }; }
  const { parsed, slots } = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;

  // intégrité : la formation appartient au tenant
  const formation = await prisma.formation.findFirst({ where: { id: d.formationId, organizationId: ctx.organizationId } });
  if (!formation) return { error: "Formation invalide." };

  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (end < start) return { error: "La date de fin doit suivre la date de début." };
  const conflicts = await findSessionSchedulingConflicts({
    organizationId: ctx.organizationId,
    startDate: start,
    endDate: end,
    slots,
    trainerId: d.trainerId || null,
    roomId: d.roomId || null,
  });
  if (conflicts.length) return { error: conflicts[0] };

  const created = await prisma.session.create({
    data: {
      organizationId: ctx.organizationId,
      formationId: d.formationId,
      trainerId: d.trainerId || null,
      roomId: d.roomId || null,
      startDate: start,
      endDate: end,
      slots,
      capacity: d.capacity,
      pricePerLearner: Math.round(d.priceEuros * 100),
      breakEvenSeats: d.breakEvenSeats,
      status: d.status,
      trainerConfirmed: d.trainerConfirmed ?? false,
    },
  });
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  redirect(`/sessions/${created.id}`);
}

export async function updateSession(id: string, _prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.session.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return { error: "Session introuvable." };

  const { parsed, slots } = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  const start = new Date(d.startDate);
  const end = new Date(d.endDate);
  if (end < start) return { error: "La date de fin doit suivre la date de début." };
  const conflicts = await findSessionSchedulingConflicts({
    organizationId: ctx.organizationId,
    startDate: start,
    endDate: end,
    slots,
    trainerId: d.trainerId || null,
    roomId: d.roomId || null,
    excludeSessionId: id,
  });
  if (conflicts.length) return { error: conflicts[0] };

  await prisma.session.update({
    where: { id },
    data: {
      formationId: d.formationId, trainerId: d.trainerId || null, roomId: d.roomId || null,
      startDate: start, endDate: end, slots, capacity: d.capacity, pricePerLearner: Math.round(d.priceEuros * 100),
      breakEvenSeats: d.breakEvenSeats, status: d.status, trainerConfirmed: d.trainerConfirmed ?? false,
    },
  });
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/dashboard");
  redirect(`/sessions/${id}`);
}

export async function deleteSession(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.session.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.session.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  redirect("/sessions");
}

export async function confirmTrainer(id: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const existing = await prisma.session.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!existing) return;
  await prisma.session.update({ where: { id }, data: { trainerConfirmed: !existing.trainerConfirmed } });
  revalidatePath(`/sessions/${id}`);
  revalidatePath("/dashboard");
}
