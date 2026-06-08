"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser } from "@/server/trainer-portal";
import type { FormActionState } from "@/server/formations-actions";

const SLOTS = ["MATIN", "APRES_MIDI", "JOURNEE", "SOIR"] as const;
const AVAIL_TYPES = ["DISPONIBLE", "INDISPONIBLE", "TENTATIVE"] as const;

/** Récupère la fiche formateur de l'utilisateur courant (ou null). */
async function currentTrainer() {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  return { ctx, trainer };
}

function parseDate(s: string): Date {
  return new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
}

/** Définit (upsert) une disponibilité du formateur pour une date + créneau. */
export async function setMyAvailability(dateISO: string, slot: string, type: string, note?: string): Promise<FormActionState> {
  const { trainer } = await currentTrainer();
  if (!trainer) return { error: "Aucune fiche formateur liée à votre compte." };
  if (!SLOTS.includes(slot as never) || !AVAIL_TYPES.includes(type as never)) return { error: "Créneau ou statut invalide." };
  const date = parseDate(dateISO);
  const existing = await prisma.trainerAvailability.findFirst({ where: { trainerId: trainer.id, date, slot: slot as never } });
  if (existing) {
    await prisma.trainerAvailability.update({ where: { id: existing.id }, data: { type: type as never, note: note || null } });
  } else {
    await prisma.trainerAvailability.create({ data: { trainerId: trainer.id, date, slot: slot as never, type: type as never, note: note || null } });
  }
  revalidatePath("/trainer/disponibilites");
  revalidatePath("/trainer");
  return { ok: true };
}

/** Supprime une disponibilité (date + créneau). */
export async function clearMyAvailability(dateISO: string, slot: string): Promise<FormActionState> {
  const { trainer } = await currentTrainer();
  if (!trainer) return { error: "Aucune fiche formateur liée à votre compte." };
  const date = parseDate(dateISO);
  await prisma.trainerAvailability.deleteMany({ where: { trainerId: trainer.id, date, slot: slot as never } });
  revalidatePath("/trainer/disponibilites");
  return { ok: true };
}

/** Applique une disponibilité à plusieurs dates d'un coup. */
export async function bulkSetAvailability(datesISO: string[], slot: string, type: string): Promise<FormActionState> {
  const { trainer } = await currentTrainer();
  if (!trainer) return { error: "Aucune fiche formateur liée à votre compte." };
  if (!SLOTS.includes(slot as never) || !AVAIL_TYPES.includes(type as never)) return { error: "Données invalides." };
  for (const d of datesISO.slice(0, 60)) {
    const date = parseDate(d);
    const existing = await prisma.trainerAvailability.findFirst({ where: { trainerId: trainer.id, date, slot: slot as never } });
    if (existing) await prisma.trainerAvailability.update({ where: { id: existing.id }, data: { type: type as never } });
    else await prisma.trainerAvailability.create({ data: { trainerId: trainer.id, date, slot: slot as never, type: type as never } });
  }
  revalidatePath("/trainer/disponibilites");
  return { ok: true };
}

// ── Profil formateur (auto-édition) ───────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, "Prénom requis."),
  lastName: z.string().min(1, "Nom requis."),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialities: z.string().optional(),
  yearsExperience: z.coerce.number().int().min(0).optional(),
});

export async function updateMyProfile(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const { trainer } = await currentTrainer();
  if (!trainer) return { error: "Aucune fiche formateur liée à votre compte." };
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    bio: formData.get("bio") || undefined,
    specialities: formData.get("specialities") || undefined,
    yearsExperience: formData.get("yearsExperience") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.trainer.update({
    where: { id: trainer.id },
    data: {
      firstName: d.firstName, lastName: d.lastName, initials: (d.firstName[0] + d.lastName[0]).toUpperCase(),
      phone: d.phone, bio: d.bio, yearsExperience: d.yearsExperience ?? null,
      specialities: (d.specialities ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    },
  });
  revalidatePath("/trainer/profil");
  return { ok: true };
}

// ── Demandes de modification ──────────────────────────────────────
const requestSchema = z.object({
  requestType: z.enum(["unavailable", "partial", "propose_date", "conflict", "other"]),
  reason: z.string().min(3, "Précisez le motif."),
  sessionId: z.string().optional(),
  proposedDate: z.string().optional(),
  proposedSlot: z.string().optional(),
  urgency: z.enum(["low", "normal", "high"]).optional(),
});

export async function createChangeRequest(_prev: FormActionState, formData: FormData): Promise<FormActionState> {
  const { ctx, trainer } = await currentTrainer();
  if (!trainer) return { error: "Aucune fiche formateur liée à votre compte." };
  const parsed = requestSchema.safeParse({
    requestType: formData.get("requestType"),
    reason: formData.get("reason"),
    sessionId: formData.get("sessionId") || undefined,
    proposedDate: formData.get("proposedDate") || undefined,
    proposedSlot: formData.get("proposedSlot") || undefined,
    urgency: formData.get("urgency") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const d = parsed.data;
  await prisma.changeRequest.create({
    data: {
      organizationId: ctx.organizationId, trainerId: trainer.id,
      sessionId: d.sessionId || null, requestType: d.requestType, reason: d.reason,
      proposedDate: d.proposedDate ? parseDate(d.proposedDate) : null,
      proposedSlot: d.proposedSlot && SLOTS.includes(d.proposedSlot as never) ? (d.proposedSlot as never) : null,
      urgency: d.urgency ?? "normal", status: "pending",
    },
  });
  revalidatePath("/trainer/demandes");
  revalidatePath("/formateurs/demandes");
  return { ok: true };
}

export async function cancelMyChangeRequest(id: string): Promise<void> {
  const { trainer } = await currentTrainer();
  if (!trainer) return;
  await prisma.changeRequest.updateMany({ where: { id, trainerId: trainer.id, status: "pending" }, data: { status: "cancelled" } });
  revalidatePath("/trainer/demandes");
}
