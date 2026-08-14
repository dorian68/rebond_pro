"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/platform";
import {
  changePlatformAdminAccess,
  findUserIdByEmail,
  PlatformAdminAccessError,
} from "@/server/platform-admin-access";

export type PlatformAdminAccessActionResult = {
  ok: boolean;
  message?: string;
  error?: string;
};

const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide.");
const userIdSchema = z.string().trim().min(1, "Utilisateur invalide.").max(128, "Utilisateur invalide.");

function safeError(error: unknown): PlatformAdminAccessActionResult {
  if (error instanceof PlatformAdminAccessError) return { ok: false, error: error.message };
  console.error("platform_admin_access_failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return { ok: false, error: "La modification n’a pas pu être enregistrée. Réessayez." };
}

export async function grantPlatformAdminByEmail(rawEmail: string): Promise<PlatformAdminAccessActionResult> {
  const actor = await requirePlatformAdmin();
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Adresse email invalide." };

  try {
    const targetUserId = await findUserIdByEmail(parsed.data);
    if (!targetUserId) {
      return {
        ok: false,
        error: "Aucun compte ne correspond à cette adresse. La personne doit d’abord créer et vérifier son compte.",
      };
    }
    await changePlatformAdminAccess({ actor, targetUserId, enabled: true });
    revalidatePath("/admin/super-admins");
    return { ok: true, message: "L’accès super-admin a été accordé." };
  } catch (error) {
    return safeError(error);
  }
}

export async function revokePlatformAdmin(rawUserId: string): Promise<PlatformAdminAccessActionResult> {
  const actor = await requirePlatformAdmin();
  const parsed = userIdSchema.safeParse(rawUserId);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Utilisateur invalide." };

  try {
    await changePlatformAdminAccess({ actor, targetUserId: parsed.data, enabled: false });
    revalidatePath("/admin/super-admins");
    return { ok: true, message: "L’accès super-admin a été retiré." };
  } catch (error) {
    return safeError(error);
  }
}
