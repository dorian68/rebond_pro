"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, requireRole } from "@/lib/tenant";

const STAFF = ["OWNER", "ADMIN", "ASSISTANT"] as const;
const DECISIONS = { accept: "accepted", reject: "rejected", counter: "counter_proposed" } as const;

/** Le centre traite une demande de modification d'un formateur. */
export async function respondToChangeRequest(id: string, decision: keyof typeof DECISIONS, response?: string): Promise<void> {
  const ctx = await requireTenant();
  requireRole(ctx, [...STAFF]);
  const req = await prisma.changeRequest.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!req || req.status !== "pending") return;

  const status = DECISIONS[decision];
  await prisma.changeRequest.update({ where: { id }, data: { status, centerResponse: response || null } });

  // Si la demande d'indisponibilité est acceptée et porte une date+créneau, on la répercute.
  if (decision === "accept" && req.proposedDate && req.proposedSlot) {
    const existing = await prisma.trainerAvailability.findFirst({ where: { trainerId: req.trainerId, date: req.proposedDate, slot: req.proposedSlot } });
    if (existing) await prisma.trainerAvailability.update({ where: { id: existing.id }, data: { type: "INDISPONIBLE" } });
    else await prisma.trainerAvailability.create({ data: { trainerId: req.trainerId, date: req.proposedDate, slot: req.proposedSlot, type: "INDISPONIBLE" } });
  }

  revalidatePath("/formateurs/demandes");
  revalidatePath("/trainer/demandes");
}
