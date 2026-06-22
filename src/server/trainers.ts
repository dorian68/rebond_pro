import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export type TrainerListItem = Awaited<ReturnType<typeof listTrainers>>[number];

export async function listTrainers(ctx: TenantContext) {
  const now = new Date();
  const trainers = await prisma.trainer.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: {
      sessions: { where: { deletedAt: null, status: { not: "ANNULEE" } }, select: { id: true, startDate: true, endDate: true, trainerConfirmed: true } },
      formations: { select: { formationId: true } },
    },
    orderBy: { lastName: "asc" },
  });

  return trainers.map((t) => {
    const upcoming = t.sessions.filter((s) => s.endDate >= now);
    const unconfirmed = upcoming.some((s) => !s.trainerConfirmed);
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      initials: t.initials ?? (t.firstName[0] + t.lastName[0]).toUpperCase(),
      email: t.email,
      phone: t.phone,
      color: t.color ?? "#2469a6",
      specialities: t.specialities,
      active: t.active,
      upcomingSessions: upcoming.length,
      totalSessions: t.sessions.length,
      formationsCount: t.formations.length,
      status: !t.active ? "Inactif" : unconfirmed ? "À confirmer" : upcoming.length > 0 ? "Actif" : "Disponible",
      statusTone: !t.active ? "badge-neutral" : unconfirmed ? "badge-warn" : "badge-positive",
    };
  });
}

export async function getTrainer(ctx: TenantContext, id: string) {
  return prisma.trainer.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      formations: { include: { formation: { select: { id: true, title: true, color: true } } } },
      availabilities: { orderBy: { date: "asc" } },
      sessions: {
        where: { deletedAt: null },
        orderBy: { startDate: "asc" },
        include: { formation: { select: { title: true } }, _count: { select: { enrollments: true } } },
      },
    },
  });
}

export async function trainerOptions(ctx: TenantContext) {
  return prisma.trainer.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null, active: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
