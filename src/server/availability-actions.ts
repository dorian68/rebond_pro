"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT", "TRAINER"] as const;
const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"];

export async function addUnavailability(trainerId: string, formData: FormData): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const trainer = await prisma.trainer.findFirst({ where: { id: trainerId, organizationId: ctx.organizationId } });
  if (!trainer) return;
  const dateStr = String(formData.get("date") || "");
  const slot = String(formData.get("slot") || "JOURNEE");
  if (!dateStr || !SLOTS.includes(slot)) return;
  const date = new Date(dateStr + "T00:00:00Z");

  const exists = await prisma.trainerAvailability.findFirst({ where: { trainerId, date, slot: slot as never, type: "INDISPONIBLE" } });
  if (!exists) {
    await prisma.trainerAvailability.create({ data: { trainerId, date, slot: slot as never, type: "INDISPONIBLE", note: String(formData.get("note") || "") || null } });
  }
  revalidatePath(`/formateurs/${trainerId}`);
  revalidatePath("/planning");
}

export async function removeUnavailability(availabilityId: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...EDITORS]);
  const a = await prisma.trainerAvailability.findFirst({ where: { id: availabilityId, trainer: { organizationId: ctx.organizationId } } });
  if (!a) return;
  await prisma.trainerAvailability.delete({ where: { id: availabilityId } });
  revalidatePath(`/formateurs/${a.trainerId}`);
  revalidatePath("/planning");
}
