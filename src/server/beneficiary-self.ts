import "server-only";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";

/** Contexte bénéficiaire : tenant + fiche Beneficiary liée à l'utilisateur (peut être null). */
export async function getBeneficiaryContext() {
  const ctx = await requireTenant();
  const beneficiary = await prisma.beneficiary.findFirst({ where: { userId: ctx.userId } });
  return { ctx, beneficiary };
}

export async function getMyBilanSteps(beneficiaryId: string) {
  return prisma.bilanStep.findMany({ where: { beneficiaryId }, orderBy: { order: "asc" } });
}

export async function getMyInterests(beneficiaryId: string) {
  return prisma.formationInterest.findMany({
    where: { beneficiaryId },
    include: { formation: { select: { id: true, title: true, color: true, publicSlug: true, slug: true, shortDescription: true, price: true, modality: true, level: true, coverImageUrl: true, organization: { select: { name: true, slug: true, logoUrl: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMyProgress(beneficiaryId: string) {
  const steps = await prisma.bilanStep.findMany({ where: { beneficiaryId }, select: { status: true, phase: true } });
  const total = steps.length;
  const done = steps.filter((s) => s.status === "done").length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

/** IDs des formations sauvegardées (pour marquer le catalogue). */
export async function getMySavedFormationIds(beneficiaryId: string): Promise<Set<string>> {
  const rows = await prisma.formationInterest.findMany({ where: { beneficiaryId }, select: { formationId: true } });
  return new Set(rows.map((r) => r.formationId));
}
