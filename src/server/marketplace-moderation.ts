"use server";

import { requirePlatformAdmin } from "@/lib/platform";
import {
  activateCenterPublicProfileForAdmin,
  approveCenterMarketplaceForAdmin,
  rejectCenterMarketplaceForAdmin,
  type ModerationResult,
} from "@/server/marketplace-moderation-service";

/** Valide la publication d'un centre sur la marketplace (admin god-mode). */
export async function approveCenterMarketplace(orgId: string): Promise<ModerationResult> {
  const admin = await requirePlatformAdmin();
  return approveCenterMarketplaceForAdmin(orgId, admin);
}

/** Active le profil public d'un centre depuis la modération plateforme, sans valider la marketplace. */
export async function activateCenterPublicProfile(orgId: string): Promise<ModerationResult> {
  const admin = await requirePlatformAdmin();
  return activateCenterPublicProfileForAdmin(orgId, admin);
}

/** Refuse / retire la publication d'un centre (admin god-mode). */
export async function rejectCenterMarketplace(orgId: string, reason?: string): Promise<ModerationResult> {
  const admin = await requirePlatformAdmin();
  return rejectCenterMarketplaceForAdmin(orgId, admin, reason);
}
