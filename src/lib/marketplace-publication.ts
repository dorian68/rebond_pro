import type { Prisma } from "@prisma/client";

/**
 * Un statut APPROVED seul ne suffit pas : les imports et anciens seeds pouvaient
 * le positionner sans revue humaine. Toute surface publique partage ce verrou.
 */
export const VERIFIED_MARKETPLACE_ORGANIZATION = {
  deletedAt: null,
  publicProfileEnabled: true,
  marketplaceStatus: "APPROVED",
  marketplaceReviewedAt: { not: null },
  marketplaceReviewedBy: { not: null },
} satisfies Prisma.OrganizationWhereInput;
