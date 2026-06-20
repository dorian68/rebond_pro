import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export async function getOrganizationSettings(ctx: TenantContext) {
  return prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      id: true, name: true, slug: true, siret: true, website: true, description: true,
      logoUrl: true, coverImageUrl: true, tagline: true, city: true, timezone: true, currency: true,
      legalName: true, legalAddress: true, nda: true, legalRep: true,
      publicProfileEnabled: true, publicEmail: true, publicPhone: true, socialLinks: true,
      specialties: true, modalities: true, certifications: true,
      plan: true, billingStatus: true, trialEndsAt: true,
    },
  });
}

export async function getMembers(ctx: TenantContext) {
  return prisma.membership.findMany({
    where: { organizationId: ctx.organizationId, status: { not: "SUSPENDED" } },
    include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getDocumentTemplates(ctx: TenantContext) {
  return prisma.documentTemplate.findMany({
    where: { OR: [{ organizationId: ctx.organizationId }, { organizationId: null }] },
    orderBy: [{ status: "asc" }, { isDefault: "desc" }, { organizationId: "desc" }, { type: "asc" }, { updatedAt: "desc" }],
  });
}
