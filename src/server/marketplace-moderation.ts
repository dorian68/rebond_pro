"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform";
import { sendEmail, brandedEmail } from "@/lib/email";
import { revalidateMarketplace } from "@/server/marketplace";
import { logger } from "@/lib/logger";

export type ModerationResult = { ok: boolean; error?: string };

/** Destinataire de la notification centre : email public sinon email du propriétaire (OWNER). */
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

/** Valide la publication d'un centre sur la marketplace (admin god-mode) + email de confirmation. */
export async function approveCenterMarketplace(orgId: string): Promise<ModerationResult> {
  const admin = await requirePlatformAdmin();
  const readiness = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      publicProfileEnabled: true,
      _count: { select: { formations: { where: { isPublic: true, status: "PUBLIE", deletedAt: null } } } },
    },
  });
  if (!readiness) return { ok: false, error: "Centre introuvable." };
  if (!readiness.publicProfileEnabled) return { ok: false, error: "Activez d'abord le profil public du centre." };
  if (readiness._count.formations === 0) {
    return { ok: false, error: "Publiez au moins une formation avant de valider ce centre sur la marketplace." };
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
  revalidateMarketplace();
  revalidatePath("/admin");
  revalidatePath(`/admin/centres/${orgId}`);
  revalidatePath("/marketplace");
  revalidatePath(`/${org.slug}`);

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
  return { ok: true };
}

/** Refuse / retire la publication d'un centre (admin god-mode) + email avec motif éventuel. */
export async function rejectCenterMarketplace(orgId: string, reason?: string): Promise<ModerationResult> {
  const admin = await requirePlatformAdmin();
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
  revalidateMarketplace();
  revalidatePath("/admin");
  revalidatePath(`/admin/centres/${orgId}`);
  revalidatePath("/marketplace");
  revalidatePath(`/${org.slug}`);

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
  return { ok: true };
}
