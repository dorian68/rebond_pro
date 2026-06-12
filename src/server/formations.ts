import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export type FormationListItem = Awaited<ReturnType<typeof listFormations>>[number];

/** Liste des formations du tenant + métriques dérivées (sessions à venir, remplissage, CA). */
export async function listFormations(ctx: TenantContext) {
  const now = new Date();
  const formations = await prisma.formation.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: {
      sessions: {
        where: { deletedAt: null, status: { not: "ANNULEE" } },
        select: { id: true, capacity: true, pricePerLearner: true, startDate: true, endDate: true, status: true, _count: { select: { enrollments: true } } },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return formations.map((f) => {
    const upcoming = f.sessions.filter((s) => s.endDate >= now && s.status !== "TERMINEE");
    const fillRates = upcoming.map((s) => (s.capacity > 0 ? (s._count.enrollments / s.capacity) * 100 : 0));
    const avgFill = fillRates.length ? Math.round(fillRates.reduce((a, b) => a + b, 0) / fillRates.length) : 0;
    const forecast = upcoming.reduce((acc, s) => acc + s._count.enrollments * s.pricePerLearner, 0);
    return {
      id: f.id,
      title: f.title,
      slug: f.slug,
      category: f.category,
      shortDescription: f.shortDescription,
      durationDays: f.durationDays,
      durationHours: f.durationHours,
      price: f.price,
      modality: f.modality,
      level: f.level,
      status: f.status,
      color: f.color ?? "#2469a6",
      isPublic: f.isPublic,
      publicSlug: f.publicSlug,
      upcomingSessions: upcoming.length,
      totalSessions: f._count.sessions,
      avgFill,
      forecast,
    };
  });
}

/** Détail d'une formation (avec sessions, formateurs éligibles). Renvoie null si hors tenant. */
export async function getFormation(ctx: TenantContext, id: string) {
  const f = await prisma.formation.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      eligibleTrainers: { include: { trainer: { select: { id: true, firstName: true, lastName: true, initials: true, color: true, specialities: true } } } },
      sessions: {
        where: { deletedAt: null },
        orderBy: { startDate: "asc" },
        include: { trainer: { select: { firstName: true, lastName: true } }, _count: { select: { enrollments: true } } },
      },
      documents: { select: { id: true, type: true, status: true } },
      testimonials: true,
      faqs: { orderBy: { position: "asc" } },
    },
  });
  return f;
}

/** Liste légère (id+title) pour les sélecteurs (sessions, prospects…). */
export async function formationOptions(ctx: TenantContext) {
  return prisma.formation.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, title: true, price: true, durationDays: true },
    orderBy: { title: "asc" },
  });
}
