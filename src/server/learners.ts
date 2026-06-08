import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";
import { formatDateShort } from "@/lib/utils";

export type LearnerListItem = Awaited<ReturnType<typeof listLearners>>[number];

export async function listLearners(ctx: TenantContext) {
  const learners = await prisma.learner.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: { session: { include: { formation: { select: { title: true } } } } },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return learners.map((l) => {
    const latest = l.enrollments[0];
    return {
      id: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      email: l.email,
      company: l.company,
      enrollmentCount: l.enrollments.length,
      latestFormation: latest?.session.formation.title ?? null,
      latestSessionDate: latest ? formatDateShort(latest.session.startDate) : null,
      latestStatus: latest?.status ?? null,
      satisfaction: l.enrollments.find((e) => e.satisfactionRating)?.satisfactionRating ?? null,
    };
  });
}

export async function getLearner(ctx: TenantContext, id: string) {
  return prisma.learner.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      enrollments: {
        orderBy: { createdAt: "desc" },
        include: { session: { include: { formation: { select: { id: true, title: true } } } } },
      },
    },
  });
}

/** Sessions ouvertes à l'inscription (pour le sélecteur d'inscription). */
export async function enrollableSessions(ctx: TenantContext) {
  const now = new Date();
  const sessions = await prisma.session.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null, status: { in: ["BROUILLON", "OUVERTE"] }, endDate: { gte: now } },
    include: { formation: { select: { title: true } }, _count: { select: { enrollments: true } } },
    orderBy: { startDate: "asc" },
  });
  return sessions.map((s) => ({ id: s.id, label: `${s.formation.title} — ${formatDateShort(s.startDate)}`, capacity: s.capacity, enrolled: s._count.enrollments }));
}
