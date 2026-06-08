"use server";

import { createPublicLead, publicLeadSchema } from "@/server/public-conversion";

export type PublicLeadState = { error?: string; ok?: boolean } | undefined;

export async function submitPublicLead(
  orgSlug: string,
  publicSlug: string,
  _prev: PublicLeadState,
  formData: FormData,
): Promise<PublicLeadState> {
  if (String(formData.get("website") || "")) return { ok: true };

  const parsed = publicLeadSchema.safeParse({
    contactName: formData.get("contactName"),
    company: formData.get("company") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    intent: formData.get("intent"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };

  try {
    await createPublicLead(orgSlug, publicSlug, parsed.data);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_FORMATION_NOT_FOUND") {
      return { error: "Cette formation n'est plus disponible." };
    }
    console.error("[public-lead] create failed", { orgSlug, publicSlug, error });
    return { error: "Votre demande n'a pas pu être envoyée. Réessayez dans quelques instants." };
  }
}
