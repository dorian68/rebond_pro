"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getTrainerForUser } from "@/server/trainer-portal";

/** Confirme la présence du formateur sur une session. */
export async function confirmTrainerSession(sessionId: string): Promise<void> {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  if (!trainer) return;
  await prisma.session.updateMany({
    where: { id: sessionId, organizationId: ctx.organizationId, trainerId: trainer.id },
    data: { trainerConfirmed: true },
  });
  revalidatePath("/trainer");
}

/** Ajoute une note post-session. */
export async function addSessionNote(sessionId: string, notes: string): Promise<void> {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  if (!trainer) return;
  await prisma.session.updateMany({
    where: { id: sessionId, organizationId: ctx.organizationId, trainerId: trainer.id },
    data: { notes: notes.slice(0, 2000) },
  });
  revalidatePath("/trainer");
}

/** Marque un apprenant présent/absent sur une session. */
export async function markAttendance(enrollmentId: string, sessionId: string, present: boolean): Promise<void> {
  const ctx = await requireTenant();
  const trainer = await getTrainerForUser(ctx.userId, ctx.organizationId);
  if (!trainer) return;
  const session = await prisma.session.findFirst({ where: { id: sessionId, organizationId: ctx.organizationId, trainerId: trainer.id } });
  if (!session) return;
  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: present ? "PRESENT" : "ABSENT" },
  });
  revalidatePath(`/trainer/sessions/${sessionId}`);
}
