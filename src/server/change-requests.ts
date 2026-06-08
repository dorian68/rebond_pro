import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

/** Liste des demandes de modification des formateurs du centre. */
export async function listChangeRequests(ctx: TenantContext) {
  return prisma.changeRequest.findMany({
    where: { organizationId: ctx.organizationId },
    include: { trainer: { select: { id: true, firstName: true, lastName: true, color: true, initials: true, photoUrl: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function countPendingChangeRequests(ctx: TenantContext) {
  return prisma.changeRequest.count({ where: { organizationId: ctx.organizationId, status: "pending" } });
}
