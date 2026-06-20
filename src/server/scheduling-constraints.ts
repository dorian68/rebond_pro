import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, dayKey } from "@/lib/utils";

function expandSlots(slots: string[]): Set<string> {
  const out = new Set<string>();
  for (const slot of slots) {
    if (slot === "JOURNEE") {
      out.add("MATIN");
      out.add("APRES_MIDI");
    } else {
      out.add(slot);
    }
  }
  if (out.size === 0) {
    out.add("MATIN");
    out.add("APRES_MIDI");
  }
  return out;
}

export function slotsOverlap(a: string[], b: string[]): boolean {
  const left = expandSlots(a);
  const right = expandSlots(b);
  for (const slot of left) if (right.has(slot)) return true;
  return false;
}

export function dateRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return dayKey(aStart) <= dayKey(bEnd) && dayKey(bStart) <= dayKey(aEnd);
}

function daysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endKey = dayKey(end);
  while (dayKey(cursor) <= endKey) {
    out.push(dayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

export type SessionSchedulingInput = {
  organizationId: string;
  startDate: Date;
  endDate: Date;
  slots: string[];
  trainerId?: string | null;
  roomId?: string | null;
  excludeSessionId?: string | null;
};

export async function findSessionSchedulingConflicts(input: SessionSchedulingInput): Promise<string[]> {
  const conflicts: string[] = [];
  if (input.endDate < input.startDate) {
    conflicts.push("La date de fin doit suivre la date de début.");
    return conflicts;
  }

  if (input.trainerId) {
    const trainer = await prisma.trainer.findFirst({
      where: { id: input.trainerId, organizationId: input.organizationId, deletedAt: null, active: true },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!trainer) {
      conflicts.push("Formateur invalide.");
    } else {
      const days = daysBetween(input.startDate, input.endDate);
      const unavailable = await prisma.trainerAvailability.findMany({
        where: {
          trainerId: trainer.id,
          type: "INDISPONIBLE",
          date: { gte: new Date(`${days[0]}T00:00:00.000Z`), lte: new Date(`${days[days.length - 1]}T23:59:59.999Z`) },
        },
        select: { date: true, slot: true },
      });
      const hit = unavailable.find((a) => days.includes(dayKey(a.date)) && slotsOverlap(input.slots, [a.slot]));
      if (hit) conflicts.push(`${trainer.firstName} ${trainer.lastName} est indisponible le ${dayKey(hit.date)} (${hit.slot}).`);

      const trainerSessions = await prisma.session.findMany({
        where: {
          organizationId: input.organizationId,
          trainerId: trainer.id,
          deletedAt: null,
          status: { not: "ANNULEE" },
          ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}),
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { startDate: true, endDate: true, slots: true, formation: { select: { title: true } } },
      });
      const busy = trainerSessions.find((s) => dateRangesOverlap(input.startDate, input.endDate, s.startDate, s.endDate) && slotsOverlap(input.slots, s.slots));
      if (busy) conflicts.push(`${trainer.firstName} ${trainer.lastName} a déjà une session sur ce créneau (${busy.formation.title}).`);
    }
  }

  if (input.roomId) {
    const room = await prisma.room.findFirst({
      where: { id: input.roomId, organizationId: input.organizationId },
      select: { id: true, name: true },
    });
    if (!room) {
      conflicts.push("Salle invalide.");
    } else {
      const roomSessions = await prisma.session.findMany({
        where: {
          organizationId: input.organizationId,
          roomId: room.id,
          deletedAt: null,
          status: { not: "ANNULEE" },
          ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}),
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { startDate: true, endDate: true, slots: true, formation: { select: { title: true } } },
      });
      const busy = roomSessions.find((s) => dateRangesOverlap(input.startDate, input.endDate, s.startDate, s.endDate) && slotsOverlap(input.slots, s.slots));
      if (busy) conflicts.push(`La salle ${room.name} est déjà occupée sur ce créneau (${busy.formation.title}).`);
    }
  }

  return conflicts;
}

export async function assertSessionSchedulable(input: SessionSchedulingInput): Promise<void> {
  const conflicts = await findSessionSchedulingConflicts(input);
  if (conflicts.length) throw new Error(conflicts[0]);
}
