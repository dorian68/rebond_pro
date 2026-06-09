import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

/** Bénéficiaires accompagnés par le centre/opérateur. */
export async function listBeneficiaries(ctx: TenantContext) {
  const rows = await prisma.beneficiary.findMany({
    where: { organizationId: ctx.organizationId },
    include: { _count: { select: { steps: true, interests: true } }, steps: { select: { status: true } }, user: { select: { email: true, lastLoginAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((b) => {
    const total = b.steps.length;
    const done = b.steps.filter((s) => s.status === "done").length;
    return { ...b, progress: total ? Math.round((done / total) * 100) : 0, stepsDone: done, stepsTotal: total };
  });
}

export async function getBeneficiary(ctx: TenantContext, id: string) {
  return prisma.beneficiary.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      user: { select: { email: true, lastLoginAt: true } },
      steps: { orderBy: { order: "asc" } },
      interests: { include: { formation: { select: { id: true, title: true, color: true, organization: { select: { name: true, slug: true } } } } }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function countBeneficiaries(ctx: TenantContext) {
  return prisma.beneficiary.count({ where: { organizationId: ctx.organizationId } });
}
