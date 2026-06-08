import "server-only";
import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/tenant";

export type JobType = "pdf_bulk" | "email_bulk";

/** Crée un job en attente et retourne son id. */
export async function enqueueJob(ctx: TenantContext, type: JobType, payload: Record<string, unknown>): Promise<string> {
  const job = await prisma.backgroundJob.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { organizationId: ctx.organizationId, type, payload: payload as any },
  });
  return job.id;
}

/** Démarre l'exécution d'un job (marque RUNNING). */
export async function startJob(jobId: string): Promise<void> {
  await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: "RUNNING", startedAt: new Date() } });
}

/** Termine un job avec succès. */
export async function completeJob(jobId: string, resultUrl?: string): Promise<void> {
  await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: "DONE", completedAt: new Date(), resultUrl: resultUrl ?? null } });
}

/** Marque un job comme échoué. */
export async function failJob(jobId: string, error: string): Promise<void> {
  await prisma.backgroundJob.update({ where: { id: jobId }, data: { status: "FAILED", completedAt: new Date(), error: error.slice(0, 500) } });
}

/** Retourne l'état d'un job. */
export async function getJob(ctx: TenantContext, jobId: string) {
  return prisma.backgroundJob.findFirst({ where: { id: jobId, organizationId: ctx.organizationId } });
}

/** Jobs en attente d'un tenant. */
export async function getPendingJobs(orgId: string) {
  return prisma.backgroundJob.findMany({ where: { organizationId: orgId, status: "PENDING" }, orderBy: { createdAt: "asc" } });
}
