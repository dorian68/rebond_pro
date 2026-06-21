import "server-only";
import { prisma } from "@/lib/prisma";

export const PLATFORM_BENEFICIARY_ORG_SLUG = "le-bon-rebond-bilans";

export async function getPlatformBeneficiaryOrganization() {
  const existing = await prisma.organization.findFirst({
    where: { slug: PLATFORM_BENEFICIARY_ORG_SLUG, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: "Le Bon Rebond - Bilans",
      slug: PLATFORM_BENEFICIARY_ORG_SLUG,
      publicProfileEnabled: false,
      marketplaceStatus: "REJECTED",
      marketplaceRejectionReason: "Espace interne plateforme pour dossiers de bilan non encore transmis à un centre de formation.",
      specialties: ["Bilan de compétences"],
    },
    select: { id: true, name: true, slug: true },
  });
}
