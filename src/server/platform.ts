import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Agrégations CROSS-TENANT pour le super-admin plateforme.
 * ⚠️ Aucune restriction organizationId : à n'appeler QUE derrière requirePlatformAdmin().
 */

export async function getPlatformOverview() {
  const now = new Date();
  // Requêtes par petits lots pour ne pas saturer le pooler (mode session, pool_size limité).
  const [centers, trainers, beneficiaries] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.trainer.count({ where: { deletedAt: null, active: true } }),
    prisma.beneficiary.count({}),
  ]);
  const [learners, publishedFormations, upcomingSessions] = await Promise.all([
    prisma.learner.count({ where: { deletedAt: null } }),
    prisma.formation.count({ where: { deletedAt: null, isPublic: true, status: "PUBLIE" } }),
    prisma.session.count({ where: { deletedAt: null, endDate: { gte: now }, status: { not: "ANNULEE" } } }),
  ]);
  const [activeProspects, paidOrgs, sessionsAgg] = await Promise.all([
    prisma.prospect.count({ where: { deletedAt: null, stage: { notIn: ["GAGNE", "PERDU"] } } }),
    prisma.organization.count({ where: { deletedAt: null, plan: { not: "FREE" } } }),
    prisma.session.findMany({ where: { deletedAt: null, status: { not: "ANNULEE" } }, select: { pricePerLearner: true, _count: { select: { enrollments: true } } } }),
  ]);
  const networkRevenue = sessionsAgg.reduce((sum, s) => sum + s.pricePerLearner * s._count.enrollments, 0);
  return { centers, trainers, beneficiaries, learners, publishedFormations, upcomingSessions, activeProspects, paidOrgs, networkRevenue };
}

export async function listAllCenters() {
  const now = new Date();
  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: {
      id: true, name: true, slug: true, city: true, logoUrl: true, plan: true, billingStatus: true, publicProfileEnabled: true, createdAt: true,
      _count: {
        select: {
          trainers: { where: { deletedAt: null, active: true } },
          formations: { where: { deletedAt: null } },
          beneficiaries: true,
          prospects: { where: { deletedAt: null } },
        },
      },
      sessions: { where: { deletedAt: null, endDate: { gte: now }, status: { not: "ANNULEE" } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return orgs.map((o) => ({ ...o, upcomingSessions: o.sessions.length }));
}

export async function getCenterDetail(orgId: string) {
  const now = new Date();
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true, name: true, slug: true, city: true, logoUrl: true, description: true, plan: true, billingStatus: true, trialEndsAt: true,
      publicProfileEnabled: true, createdAt: true, website: true, publicEmail: true, publicPhone: true,
      trainers: { where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, active: true, specialities: true, userId: true }, orderBy: { lastName: "asc" } },
      formations: { where: { deletedAt: null }, select: { id: true, title: true, status: true, isPublic: true, price: true }, orderBy: { updatedAt: "desc" } },
      beneficiaries: { select: { id: true, firstName: true, lastName: true, status: true }, orderBy: { createdAt: "desc" } },
      _count: { select: { sessions: { where: { deletedAt: null, endDate: { gte: now } } }, prospects: { where: { deletedAt: null } }, learners: { where: { deletedAt: null } } } },
    },
  });
}

export async function listAllTrainers() {
  return prisma.trainer.findMany({
    where: { deletedAt: null },
    select: { id: true, firstName: true, lastName: true, active: true, specialities: true, userId: true, organization: { select: { id: true, name: true, slug: true } }, _count: { select: { sessions: true, formations: true } } },
    orderBy: { lastName: "asc" },
    take: 500,
  });
}

export async function listAllBeneficiaries() {
  const rows = await prisma.beneficiary.findMany({
    select: { id: true, firstName: true, lastName: true, email: true, status: true, createdAt: true, organization: { select: { id: true, name: true, slug: true } }, steps: { select: { status: true } }, _count: { select: { interests: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((b) => {
    const total = b.steps.length, done = b.steps.filter((s) => s.status === "done").length;
    return { ...b, progress: total ? Math.round((done / total) * 100) : 0 };
  });
}
