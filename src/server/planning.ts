import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { mondayOf, addDays, dayKey } from "@/lib/utils";

/** Slots normalisés pour test de chevauchement (JOURNEE = matin+aprem). */
function expandSlots(slots: string[]): Set<string> {
  const out = new Set<string>();
  for (const s of slots) {
    if (s === "JOURNEE") { out.add("MATIN"); out.add("APRES_MIDI"); }
    else out.add(s);
  }
  if (out.size === 0) { out.add("MATIN"); out.add("APRES_MIDI"); }
  return out;
}
function slotsOverlap(a: string[], b: string[]): boolean {
  const ea = expandSlots(a), eb = expandSlots(b);
  for (const s of ea) if (eb.has(s)) return true;
  return false;
}
/** Deux sessions se chevauchent-elles (plages de jours + créneaux) ? */
function sessionsConflict(a: { startDate: Date; endDate: Date; slots: string[] }, b: { startDate: Date; endDate: Date; slots: string[] }): boolean {
  const aStart = dayKey(a.startDate), aEnd = dayKey(a.endDate);
  const bStart = dayKey(b.startDate), bEnd = dayKey(b.endDate);
  const datesOverlap = aStart <= bEnd && bStart <= aEnd;
  return datesOverlap && slotsOverlap(a.slots, b.slots);
}

export type WeekPlanning = Awaited<ReturnType<typeof getWeekPlanning>>;

export async function getWeekPlanning(ctx: TenantContext, weekStartISO?: string) {
  const base = weekStartISO ? new Date(weekStartISO + "T00:00:00Z") : new Date();
  const weekStart = mondayOf(base);
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)); // Lun→Sam

  const [trainers, sessions, unavail] = await Promise.all([
    prisma.trainer.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null, active: true }, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, initials: true, color: true } }),
    prisma.session.findMany({
      where: { organizationId: ctx.organizationId, deletedAt: null, status: { not: "ANNULEE" }, startDate: { lt: weekEnd }, endDate: { gte: weekStart } },
      include: { formation: { select: { title: true, color: true } }, room: { select: { name: true } }, _count: { select: { enrollments: true } } },
    }),
    prisma.trainerAvailability.findMany({ where: { trainer: { organizationId: ctx.organizationId }, type: "INDISPONIBLE", date: { gte: weekStart, lt: weekEnd } } }),
  ]);

  // Conflits formateur (paires de sessions du même formateur qui se chevauchent)
  const conflictIds = new Set<string>();
  const byTrainer = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!s.trainerId) continue;
    const arr = byTrainer.get(s.trainerId) ?? [];
    arr.push(s);
    byTrainer.set(s.trainerId, arr);
  }
  for (const arr of byTrainer.values()) {
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      if (sessionsConflict(arr[i], arr[j])) { conflictIds.add(arr[i].id); conflictIds.add(arr[j].id); }
    }
  }
  // Conflits salle
  const byRoom = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!s.roomId) continue;
    const arr = byRoom.get(s.roomId) ?? [];
    arr.push(s);
    byRoom.set(s.roomId, arr);
  }
  const roomConflictIds = new Set<string>();
  for (const arr of byRoom.values()) {
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      if (sessionsConflict(arr[i], arr[j])) { roomConflictIds.add(arr[i].id); roomConflictIds.add(arr[j].id); }
    }
  }

  const unavailByTrainerDay = new Set<string>();
  for (const u of unavail) unavailByTrainerDay.add(`${u.trainerId}|${dayKey(u.date)}`);

  function sessionsFor(trainerId: string | null, day: Date) {
    const dk = dayKey(day);
    return sessions
      .filter((s) => (s.trainerId ?? null) === trainerId && dayKey(s.startDate) <= dk && dk <= dayKey(s.endDate))
      .map((s) => ({
        id: s.id, title: s.formation.title, color: s.formation.color ?? "#5850ec",
        slots: s.slots, enrolled: s._count.enrollments, capacity: s.capacity,
        room: s.room?.name ?? null, conflict: conflictIds.has(s.id) || roomConflictIds.has(s.id),
        isStart: dayKey(s.startDate) === dk,
      }));
  }

  const hasUnassigned = sessions.some((s) => !s.trainerId);
  const rows = trainers.map((t) => ({
    trainer: t,
    cells: days.map((day) => ({ day: dayKey(day), unavailable: unavailByTrainerDay.has(`${t.id}|${dayKey(day)}`), sessions: sessionsFor(t.id, day) })),
  }));
  if (hasUnassigned) {
    rows.push({
      trainer: { id: "__unassigned__", firstName: "Non", lastName: "assigné", initials: "?", color: "#b6bdc8" },
      cells: days.map((day) => ({ day: dayKey(day), unavailable: false, sessions: sessionsFor(null, day) })),
    });
  }

  return {
    weekStart: dayKey(weekStart),
    prevWeek: dayKey(addDays(weekStart, -7)),
    nextWeek: dayKey(addDays(weekStart, 7)),
    days: days.map((d) => dayKey(d)),
    rows,
    conflictCount: (conflictIds.size + roomConflictIds.size) > 0 ? new Set([...conflictIds, ...roomConflictIds]).size : 0,
  };
}

export type SlotSuggestion = { date: string; endDate: string; trainerId: string; trainerName: string; roomId: string | null; roomName: string | null; score: number; reason: string; conflict: boolean };

/** Moteur « Trouver les meilleurs créneaux » : propose des créneaux scorés. */
export async function findBestSlots(ctx: TenantContext, formationId: string, horizonDays = 28): Promise<SlotSuggestion[]> {
  const formation = await prisma.formation.findFirst({
    where: { id: formationId, organizationId: ctx.organizationId },
    include: { eligibleTrainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true, active: true } } } } },
  });
  if (!formation) return [];

  let trainers = formation.eligibleTrainers.map((e) => e.trainer).filter((t) => t.active);
  if (trainers.length === 0) {
    trainers = await prisma.trainer.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null, active: true }, select: { id: true, firstName: true, lastName: true, active: true } });
  }
  if (trainers.length === 0) return [];

  const duration = Math.max(1, formation.durationDays ?? 1);
  const start = addDays(mondayOf(new Date()), 0);
  const from = new Date() > start ? addDays(new Date(), 1) : start;
  const horizonEnd = addDays(from, horizonDays);

  const [sessions, unavail, rooms] = await Promise.all([
    prisma.session.findMany({ where: { organizationId: ctx.organizationId, deletedAt: null, status: { not: "ANNULEE" }, endDate: { gte: from }, startDate: { lt: horizonEnd } }, select: { trainerId: true, roomId: true, startDate: true, endDate: true, slots: true } }),
    prisma.trainerAvailability.findMany({ where: { trainer: { organizationId: ctx.organizationId }, type: "INDISPONIBLE", date: { gte: from, lt: horizonEnd } }, select: { trainerId: true, date: true } }),
    prisma.room.findMany({ where: { organizationId: ctx.organizationId }, select: { id: true, name: true, capacity: true } }),
  ]);

  const unavailSet = new Set(unavail.map((u) => `${u.trainerId}|${dayKey(u.date)}`));

  function spanDays(startDay: Date): string[] {
    // jours ouvrés consécutifs couvrant `duration`
    const out: string[] = [];
    let d = new Date(startDay);
    while (out.length < duration) {
      const dow = d.getUTCDay();
      if (dow !== 0 && dow !== 6) out.push(dayKey(d));
      d = addDays(d, 1);
    }
    return out;
  }

  const suggestions: SlotSuggestion[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const candidate = addDays(from, i);
    const dow = candidate.getUTCDay();
    if (dow === 0 || dow === 6) continue; // démarre un jour ouvré
    const span = spanDays(candidate);
    const spanSet = new Set(span);
    const endDate = new Date(span[span.length - 1] + "T17:00:00Z");

    for (const t of trainers) {
      // indispo formateur sur la plage ?
      if (span.some((dk) => unavailSet.has(`${t.id}|${dk}`))) continue;
      // session existante du formateur sur la plage ?
      const trainerBusy = sessions.some((s) => (s.trainerId === t.id) && rangeHits(s.startDate, s.endDate, spanSet));
      if (trainerBusy) continue;

      // salle libre ?
      const freeRoom = rooms.find((r) => !sessions.some((s) => s.roomId === r.id && rangeHits(s.startDate, s.endDate, spanSet)));
      const roomConflict = rooms.length > 0 && !freeRoom;

      // score : tôt = mieux ; salle dispo = mieux ; lundi/mardi léger bonus
      let score = 100 - i * 1.5;
      if (roomConflict) score -= 25;
      if (dow === 1 || dow === 2) score += 4;
      score = Math.max(40, Math.min(99, Math.round(score)));

      suggestions.push({
        date: span[0],
        endDate: dayKey(endDate),
        trainerId: t.id,
        trainerName: `${t.firstName} ${t.lastName}`,
        roomId: freeRoom?.id ?? null,
        roomName: freeRoom?.name ?? null,
        score,
        reason: roomConflict ? "Conflit salle détecté — aucune salle libre" : freeRoom ? `Salle « ${freeRoom.name} » disponible` : "Disponible (distanciel)",
        conflict: roomConflict,
      });
    }
  }

  // meilleurs scores, dédupliqués par date+trainer, top 6
  suggestions.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const top: SlotSuggestion[] = [];
  for (const s of suggestions) {
    const k = `${s.date}|${s.trainerId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    top.push(s);
    if (top.length >= 6) break;
  }
  return top;
}

function rangeHits(start: Date, end: Date, spanSet: Set<string>): boolean {
  let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endK = dayKey(end);
  while (dayKey(d) <= endK) {
    if (spanSet.has(dayKey(d))) return true;
    d = addDays(d, 1);
  }
  return false;
}
