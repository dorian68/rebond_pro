import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export async function formationOptions(ctx: TenantContext) {
  return prisma.formation.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, title: true, price: true, durationDays: true },
    orderBy: { title: "asc" },
  });
}

export async function trainerOptions(ctx: TenantContext) {
  return prisma.trainer.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null, active: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });
}

export async function roomOptions(ctx: TenantContext) {
  return prisma.room.findMany({
    where: { organizationId: ctx.organizationId },
    select: { id: true, name: true, type: true, capacity: true },
    orderBy: { name: "asc" },
  });
}

export async function sessionOptions(ctx: TenantContext) {
  const sessions = await prisma.session.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, startDate: true, formation: { select: { title: true } } },
    orderBy: { startDate: "desc" },
    take: 100,
  });
  return sessions.map((s) => ({ id: s.id, label: `${s.formation.title} — ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(s.startDate)}` }));
}

export async function learnerOptions(ctx: TenantContext) {
  return prisma.learner.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, company: true },
    orderBy: { lastName: "asc" },
  });
}
