import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

/** Sessions du formateur connecté (à venir + récentes). */
export async function getTrainerSessions(ctx: TenantContext, trainerId: string) {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.session.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        endDate: { gte: now },
        status: { not: "ANNULEE" },
        // Formateur principal OU formateur affecté à un module de la session.
        OR: [{ trainerId }, { moduleAssignments: { some: { trainerId } } }],
      },
      include: {
        formation: { select: { title: true, color: true, modality: true } },
        room: { select: { name: true } },
        _count: { select: { enrollments: true } },
        moduleAssignments: { where: { trainerId }, include: { module: { select: { title: true } } } },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.session.findMany({
      where: { organizationId: ctx.organizationId, trainerId, deletedAt: null, endDate: { lt: now } },
      include: {
        formation: { select: { title: true, color: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { startDate: "desc" },
      take: 5,
    }),
  ]);
  return { upcoming, past };
}

/** Disponibilités du formateur pour la semaine courante. */
export async function getTrainerAvailabilities(ctx: TenantContext, trainerId: string) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // lundi
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return prisma.trainerAvailability.findMany({
    where: { trainerId, date: { gte: startOfWeek, lte: endOfWeek } },
    orderBy: { date: "asc" },
  });
}

/** Fiche du formateur lié au user connecté. */
export async function getTrainerForUser(userId: string, organizationId: string) {
  return prisma.trainer.findFirst({
    where: { userId, organizationId, deletedAt: null },
  });
}

/** Inscriptions d'une session (pour la feuille d'émargement). */
export async function getSessionEnrollments(ctx: TenantContext, sessionId: string, trainerId: string) {
  return prisma.session.findFirst({
    where: { id: sessionId, organizationId: ctx.organizationId, trainerId },
    include: {
      formation: { select: { title: true, color: true } },
      room: { select: { name: true } },
      enrollments: { include: { learner: true } },
    },
  });
}
