import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser } from "@/server/trainer-portal";

/** Contexte formateur : tenant + fiche Trainer liée à l'utilisateur (peut être null). */
export async function getTrainerContext() {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  return { ctx, trainer };
}

/** Disponibilités du formateur sur une plage (par défaut : mois courant + suivant). */
export async function getMyAvailabilities(trainerId: string, from?: Date, to?: Date) {
  const start = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ?? new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);
  return prisma.trainerAvailability.findMany({
    where: { trainerId, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }],
  });
}

/** Planning complet (sessions à venir + passées) du formateur. */
export async function getMyPlanning(trainerId: string, organizationId: string) {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.session.findMany({
      where: { trainerId, organizationId, deletedAt: null, endDate: { gte: now } },
      include: { formation: { select: { title: true, color: true } }, room: { select: { name: true, type: true } }, _count: { select: { enrollments: true } } },
      orderBy: { startDate: "asc" },
    }),
    prisma.session.findMany({
      where: { trainerId, organizationId, deletedAt: null, endDate: { lt: now } },
      include: { formation: { select: { title: true, color: true } }, room: { select: { name: true, type: true } }, _count: { select: { enrollments: true } } },
      orderBy: { startDate: "desc" },
      take: 20,
    }),
  ]);
  return { upcoming, past };
}

/** Demandes de modification du formateur. */
export async function getMyChangeRequests(trainerId: string) {
  return prisma.changeRequest.findMany({ where: { trainerId }, orderBy: { createdAt: "desc" } });
}

/** Synthèse du mois pour la vue d'ensemble. */
export async function getTrainerMonthSummary(trainerId: string, organizationId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const [sessions, avails, pendingRequests] = await Promise.all([
    prisma.session.count({ where: { trainerId, organizationId, deletedAt: null, startDate: { gte: monthStart, lte: monthEnd } } }),
    prisma.trainerAvailability.findMany({ where: { trainerId, date: { gte: monthStart, lte: monthEnd } }, select: { type: true } }),
    prisma.changeRequest.count({ where: { trainerId, status: "pending" } }),
  ]);
  const dispo = avails.filter((a) => a.type === "DISPONIBLE" || a.type === "TENTATIVE").length;
  const indispo = avails.filter((a) => a.type === "INDISPONIBLE").length;
  return { sessionsThisMonth: sessions, daysAvailable: dispo, daysUnavailable: indispo, pendingRequests };
}
