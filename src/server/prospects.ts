import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export type ProspectCard = Awaited<ReturnType<typeof listProspects>>[number];

export async function listProspects(ctx: TenantContext) {
  const prospects = await prisma.prospect.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    include: { formationOfInterest: { select: { id: true, title: true } } },
    orderBy: [{ isHot: "desc" }, { updatedAt: "desc" }],
  });
  return prospects.map((p) => ({
    id: p.id,
    name: p.name,
    contactName: p.contactName,
    email: p.email,
    phone: p.phone,
    type: p.type,
    source: p.source,
    stage: p.stage,
    potentialAmount: p.potentialAmount,
    nextAction: p.nextAction,
    nextFollowUpDate: p.nextFollowUpDate ? p.nextFollowUpDate.toISOString() : null,
    isHot: p.isHot,
    formationTitle: p.formationOfInterest?.title ?? null,
    formationId: p.formationOfInterestId,
  }));
}

export async function getProspect(ctx: TenantContext, id: string) {
  return prisma.prospect.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      formationOfInterest: { select: { id: true, title: true, price: true } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
}
