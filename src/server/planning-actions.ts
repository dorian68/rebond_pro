"use server";

import { requireTenant } from "@/lib/tenant";
import { findBestSlots, type SlotSuggestion } from "@/server/planning";

export async function findBestSlotsAction(formationId: string): Promise<SlotSuggestion[]> {
  const ctx = await requireTenant();
  if (!formationId) return [];
  return findBestSlots(ctx, formationId);
}
