import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { clampPct } from "@/lib/utils";

export type SessionListItem = Awaited<ReturnType<typeof listSessions>>[number];

function uiStatus(s: { status: string; enrolled: number; breakEvenSeats: number; endDate: Date; trainerId: string | null; trainerConfirmed: boolean }, now: Date): string {
  if (s.status === "OUVERTE" && s.endDate >= now) {
    if (s.enrolled < s.breakEvenSeats || !s.trainerId || !s.trainerConfirmed) return "RISQUE";
  }
  return s.status;
}

export async function listSessions(ctx: TenantContext) {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: {
      formation: { select: { id: true, title: true, color: true } },
      trainer: { select: { id: true, firstName: true, lastName: true, initials: true, color: true } },
      room: { select: { id: true, name: true, type: true } },
      _count: { select: { enrollments: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return sessions.map((s) => {
    const enrolled = s._count.enrollments;
    const fillRate = s.capacity > 0 ? clampPct((enrolled / s.capacity) * 100) : 0;
    return {
      id: s.id,
      formation: s.formation,
      trainer: s.trainer,
      room: s.room,
      startDate: s.startDate,
      endDate: s.endDate,
      slots: s.slots,
      capacity: s.capacity,
      pricePerLearner: s.pricePerLearner,
      breakEvenSeats: s.breakEvenSeats,
      status: s.status,
      trainerConfirmed: s.trainerConfirmed,
      enrolled,
      fillRate,
      forecast: enrolled * s.pricePerLearner,
      uiStatus: uiStatus({ status: s.status, enrolled, breakEvenSeats: s.breakEvenSeats, endDate: s.endDate, trainerId: s.trainerId, trainerConfirmed: s.trainerConfirmed }, now),
      isUpcoming: s.endDate >= now && s.status !== "TERMINEE",
    };
  });
}

export async function getSession(ctx: TenantContext, id: string) {
  return prisma.session.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      formation: {
        select: {
          id: true, title: true, color: true,
          modules: {
            orderBy: { position: "asc" },
            include: { trainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true } } } } },
          },
        },
      },
      trainer: { select: { id: true, firstName: true, lastName: true, initials: true, color: true } },
      room: true,
      enrollments: {
        include: { learner: { select: { id: true, firstName: true, lastName: true, company: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      moduleAssignments: true,
    },
  });
}
