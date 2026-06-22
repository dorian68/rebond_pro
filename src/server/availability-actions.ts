"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import type { FormActionState } from "@/server/formations-actions";
import type { TenantContext } from "@/lib/tenant";

const EDITORS = ["OWNER", "ADMIN", "ASSISTANT", "TRAINER"] as const;
const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"];
const AVAILABILITY_TYPES = ["DISPONIBLE", "INDISPONIBLE", "TENTATIVE"];

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

function parseBulkItems(formData: FormData) {
  try {
    const raw = JSON.parse(String(formData.get("itemsJson") || "[]")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 300).map((item) => item as Record<string, unknown>);
  } catch {
    return [];
  }
}

function normalizeDate(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function bulkSetTrainerAvailabilities(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const ctx = await requireTenant();
  requireRole(ctx, ["OWNER", "ADMIN", "ASSISTANT"]);
  const items = parseBulkItems(formData);
  const result = await applyBulkTrainerAvailabilities(ctx, items);
  if (result?.error) return result;

  revalidatePath("/formateurs");
  revalidatePath("/formateurs/disponibilites");
  revalidatePath("/planning");
  return { ok: true };
}

export async function applyBulkTrainerAvailabilities(ctx: TenantContext, items: Record<string, unknown>[]): Promise<FormActionState> {
  if (items.length === 0) return { error: "Aucun créneau à enregistrer." };

  const trainerIds = Array.from(new Set(items.map((item) => String(item.trainerId ?? "")).filter(Boolean)));
  const trainers = await prisma.trainer.findMany({
    where: { id: { in: trainerIds }, organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true },
  });
  const validTrainerIds = new Set(trainers.map((trainer) => trainer.id));
  let upserted = 0;
  let cleared = 0;

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const trainerId = String(item.trainerId ?? "");
    if (!validTrainerIds.has(trainerId)) return { error: `Ligne ${index + 1}: formateur invalide.` };
    const date = normalizeDate(item.date);
    if (!date) return { error: `Ligne ${index + 1}: date invalide.` };
    const slot = String(item.slot || "JOURNEE");
    if (!SLOTS.includes(slot)) return { error: `Ligne ${index + 1}: créneau invalide.` };
    const type = String(item.type || "INDISPONIBLE");
    const shouldClear = type === "LIBRE" || type === "CLEAR" || type === "VIDE";
    if (!shouldClear && !AVAILABILITY_TYPES.includes(type)) return { error: `Ligne ${index + 1}: statut invalide.` };

    if (shouldClear) {
      const result = await prisma.trainerAvailability.deleteMany({ where: { trainerId, date, slot: slot as never } });
      cleared += result.count;
      continue;
    }

    const existing = await prisma.trainerAvailability.findFirst({ where: { trainerId, date, slot: slot as never } });
    if (existing) {
      await prisma.trainerAvailability.update({
        where: { id: existing.id },
        data: { type: type as never, note: String(item.note || "") || null },
      });
    } else {
      await prisma.trainerAvailability.create({
        data: { trainerId, date, slot: slot as never, type: type as never, note: String(item.note || "") || null },
      });
    }
    upserted += 1;
  }

  logger.info("trainer_availability.bulk_updated", {
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    rows: items.length,
    upserted,
    cleared,
    trainers: validTrainerIds.size,
  });
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action: "trainer_availability.bulk_updated",
      entityType: "TrainerAvailability",
      entityId: null,
      after: { rows: items.length, upserted, cleared, trainers: validTrainerIds.size },
    },
  }).catch((error) => {
    logger.error("trainer_availability.bulk_audit_failed", {
      organizationId: ctx.organizationId,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return { ok: true };
}
