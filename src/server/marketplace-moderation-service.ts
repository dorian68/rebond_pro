import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEmail, brandedEmail } from "@/lib/email";
import { revalidateMarketplace } from "@/server/marketplace";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import type { PlatformAdmin } from "@/lib/platform";

export type ModerationResult = { ok: boolean; error?: string };

type MarketplaceAuditSnapshot = {
  marketplaceStatus: string;
  publicProfileEnabled: boolean;
  publicFormationCount: number;
};

type ModerationOptions = {
  revalidate?: boolean;
  notify?: boolean;
};

async function auditMarketplaceModeration(input: {
  organizationId: string;
  actorId: string;
  action: string;
  before?: Prisma.InputJsonObject | null;
  after?: Prisma.InputJsonObject | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.action,
        entityType: "Organization",
        entityId: input.organizationId,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    });
  } catch (e) {
    logger.error("marketplace.audit_failed", {
      orgId: input.organizationId,
      action: input.action,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function centerNotifyEmail(orgId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { publicEmail: true } });
  if (org?.publicEmail) return org.publicEmail;
  const owner = await prisma.membership.findFirst({
    where: { organizationId: orgId, role: "OWNER", status: "ACTIVE" },
    select: { user: { select: { email: true } } },
  });
  return owner?.user?.email ?? null;
}

function siteUrl(path: string): string {
  const base = (process.env.APP_PUBLIC_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function revalidateModerationPaths(orgId: string, orgSlug: string) {
  revalidateMarketplace();
  revalidatePath("/admin");
  revalidatePath("/admin/centres");
  revalidatePath(`/admin/centres/${orgId}`);
  revalidatePath("/marketplace");
  revalidatePath(`/${orgSlug}`);
}

/** Valide la publication d'un centre sur la marketplace (admin god-mode) + email de confirmation. */
export async function approveCenterMarketplaceForAdmin(
  orgId: string,
  admin: PlatformAdmin,
  options: ModerationOptions = {},
): Promise<ModerationResult> {
  const shouldRevalidate = options.revalidate ?? true;
  const shouldNotify = options.notify ?? true;
  const readiness = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      marketplaceStatus: true,
      publicProfileEnabled: true,
      _count: { select: { formations: { where: { isPublic: true, status: "PUBLIE", deletedAt: null } } } },
    },
  });
  if (!readiness) return { ok: false, error: "Centre introuvable." };
  const before: MarketplaceAuditSnapshot = {
    marketplaceStatus: readiness.marketplaceStatus,
    publicProfileEnabled: readiness.publicProfileEnabled,
    publicFormationCount: readiness._count.formations,
  };
  if (!readiness.publicProfileEnabled) {
    const error = "Activez d'abord le profil public du centre.";
    logger.warn("marketplace.approve.blocked", { orgId, by: admin.email, reason: "public_profile_disabled", ...before });
    await auditMarketplaceModeration({
      organizationId: orgId,
      actorId: admin.userId,
      action: "marketplace.approve.blocked",
      before,
      after: { ok: false, reason: "public_profile_disabled", error },
    });
    return { ok: false, error };
  }
  if (readiness._count.formations === 0) {
    const error = "Publiez au moins une formation avant de valider ce centre sur la marketplace.";
    logger.warn("marketplace.approve.blocked", { orgId, by: admin.email, reason: "no_public_published_formation", ...before });
    await auditMarketplaceModeration({
      organizationId: orgId,
      actorId: admin.userId,
      action: "marketplace.approve.blocked",
      before,
      after: { ok: false, reason: "no_public_published_formation", error },
    });
    return { ok: false, error };
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      marketplaceStatus: "APPROVED",
      marketplaceReviewedAt: new Date(),
      marketplaceReviewedBy: admin.userId,
      marketplaceRejectionReason: null,
    },
    select: { id: true, name: true, slug: true },
  });

  logger.info("marketplace.approved", { orgId: org.id, by: admin.email });
  await auditMarketplaceModeration({
    organizationId: org.id,
    actorId: admin.userId,
    action: "marketplace.approved",
    before,
    after: { marketplaceStatus: "APPROVED", marketplaceReviewedBy: admin.userId, marketplaceReviewedAt: new Date().toISOString() },
  });
  if (shouldRevalidate) revalidateModerationPaths(orgId, org.slug);

  if (shouldNotify) {
    const to = await centerNotifyEmail(orgId);
    if (to) {
      const url = siteUrl(`/${org.slug}`);
      try {
        await sendEmail({
          to,
          subject: "Votre centre est validé sur Le Bon Rebond 🎉",
          text: `Bonne nouvelle ! ${org.name} est désormais visible sur la marketplace Le Bon Rebond. Votre page publique : ${url}`,
          html: brandedEmail(
            "Votre centre est en ligne",
            `<p>Bonne nouvelle !</p>
             <p><strong>${org.name}</strong> vient d'être validé par notre équipe : votre centre et vos formations publiées sont désormais visibles sur la marketplace Le Bon Rebond.</p>
             <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#E07C39;color:#fff;text-decoration:none;border-radius:100px;font-weight:700">Voir ma page publique</a></p>
             <p>Les candidats en reconversion peuvent maintenant découvrir vos formations et vous envoyer des demandes de mise en relation.</p>`,
          ),
        });
      } catch (e) {
        logger.error("marketplace.approve.email_failed", { orgId, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { ok: true };
}

/** Active le profil public d'un centre depuis la modération plateforme, sans valider la marketplace. */
export async function activateCenterPublicProfileForAdmin(
  orgId: string,
  admin: PlatformAdmin,
  options: ModerationOptions = {},
): Promise<ModerationResult> {
  const beforeOrg = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, deletedAt: true, publicProfileEnabled: true, marketplaceStatus: true },
  });

  if (!beforeOrg || beforeOrg.deletedAt) return { ok: false, error: "Centre introuvable." };
  if (beforeOrg.publicProfileEnabled) return { ok: true };

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { publicProfileEnabled: true },
    select: { id: true, slug: true, publicProfileEnabled: true, marketplaceStatus: true },
  });

  logger.info("marketplace.public_profile_activated", { orgId: org.id, by: admin.email });
  await auditMarketplaceModeration({
    organizationId: org.id,
    actorId: admin.userId,
    action: "marketplace.public_profile_activated",
    before: {
      publicProfileEnabled: beforeOrg.publicProfileEnabled,
      marketplaceStatus: beforeOrg.marketplaceStatus,
    },
    after: {
      publicProfileEnabled: org.publicProfileEnabled,
      marketplaceStatus: org.marketplaceStatus,
    },
  });

  if (options.revalidate ?? true) revalidateModerationPaths(orgId, org.slug);
  return { ok: true };
}

/** Refuse / retire la publication d'un centre (admin god-mode) + email avec motif éventuel. */
export async function rejectCenterMarketplaceForAdmin(
  orgId: string,
  admin: PlatformAdmin,
  reason?: string,
  options: ModerationOptions = {},
): Promise<ModerationResult> {
  const shouldRevalidate = options.revalidate ?? true;
  const shouldNotify = options.notify ?? true;
  const beforeOrg = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      marketplaceStatus: true,
      publicProfileEnabled: true,
      _count: { select: { formations: { where: { isPublic: true, status: "PUBLIE", deletedAt: null } } } },
    },
  });
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      marketplaceStatus: "REJECTED",
      marketplaceReviewedAt: new Date(),
      marketplaceReviewedBy: admin.userId,
      marketplaceRejectionReason: reason?.trim() || null,
    },
    select: { id: true, name: true, slug: true },
  });

  logger.info("marketplace.rejected", { orgId: org.id, by: admin.email });
  await auditMarketplaceModeration({
    organizationId: org.id,
    actorId: admin.userId,
    action: "marketplace.rejected",
    before: beforeOrg
      ? {
          marketplaceStatus: beforeOrg.marketplaceStatus,
          publicProfileEnabled: beforeOrg.publicProfileEnabled,
          publicFormationCount: beforeOrg._count.formations,
        }
      : null,
    after: {
      marketplaceStatus: "REJECTED",
      marketplaceReviewedBy: admin.userId,
      marketplaceReviewedAt: new Date().toISOString(),
      reason: reason?.trim() || null,
    },
  });
  if (shouldRevalidate) revalidateModerationPaths(orgId, org.slug);

  if (shouldNotify) {
    const to = await centerNotifyEmail(orgId);
    if (to) {
      try {
        await sendEmail({
          to,
          subject: "Votre demande de publication — Le Bon Rebond",
          text: `Votre centre ${org.name} n'a pas encore été validé pour la marketplace.${reason ? " Motif : " + reason : ""}`,
          html: brandedEmail(
            "Publication en attente",
            `<p>Bonjour,</p>
             <p>Votre centre <strong>${org.name}</strong> n'a pas encore été validé pour la marketplace Le Bon Rebond.</p>
             ${reason ? `<p><strong>Motif :</strong> ${reason.replace(/[<>&]/g, "")}</p>` : ""}
             <p>Complétez ou ajustez votre profil et vos formations, puis nous procéderons à une nouvelle revue.</p>`,
          ),
        });
      } catch (e) {
        logger.error("marketplace.reject.email_failed", { orgId, error: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  return { ok: true };
}
