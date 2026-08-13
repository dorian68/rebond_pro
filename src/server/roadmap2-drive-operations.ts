import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createRoadmap2DriveOperationRunner,
  type Roadmap2DriveOperationBeginInput,
  type Roadmap2DriveOperationJson,
  type Roadmap2DriveOperationRecord,
  type Roadmap2DriveOperationRepository,
  type Roadmap2DriveOperationType,
} from "@/server/roadmap2-drive-operation-runner";

function asJsonObject(value: Prisma.JsonValue | null): Roadmap2DriveOperationJson | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Roadmap2DriveOperationJson : null;
}

function record(value: {
  id: string;
  workspaceId: string;
  nodeId: string | null;
  operationType: Roadmap2DriveOperationType;
  status: Roadmap2DriveOperationRecord["status"];
  idempotencyKey: string;
  requestHash: string;
  providerResult: Prisma.JsonValue | null;
  result: Prisma.JsonValue | null;
  attemptCount: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  nextRetryAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
}): Roadmap2DriveOperationRecord {
  return { ...value, providerResult: asJsonObject(value.providerResult), result: asJsonObject(value.result) };
}

const select = {
  id: true,
  workspaceId: true,
  nodeId: true,
  operationType: true,
  status: true,
  idempotencyKey: true,
  requestHash: true,
  providerResult: true,
  result: true,
  attemptCount: true,
  leaseToken: true,
  leaseExpiresAt: true,
  nextRetryAt: true,
  errorCode: true,
  errorMessage: true,
} as const;

export const roadmap2DriveOperationRepository: Roadmap2DriveOperationRepository = {
  async begin(input: Roadmap2DriveOperationBeginInput) {
    const operation = await prisma.roadmap2DriveOperation.upsert({
      where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: input.idempotencyKey } },
      create: {
        workspaceId: input.workspaceId,
        nodeId: input.nodeId,
        actorUserId: input.actorUserId,
        operationType: input.operationType,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        payload: input.payload as Prisma.InputJsonValue,
      },
      update: {},
      select,
    });
    return record(operation);
  },

  async acquire(id, leaseToken, now, leaseExpiresAt) {
    const acquired = await prisma.roadmap2DriveOperation.updateMany({
      where: {
        id,
        OR: [
          { status: "pending" },
          { status: "retryable", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
          { status: "needs_repair" },
          { status: "provider_succeeded", OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] },
          { status: "running", leaseExpiresAt: { lte: now } },
        ],
      },
      data: { status: "running", leaseToken, leaseExpiresAt, nextRetryAt: null, errorCode: null, errorMessage: null, attemptCount: { increment: 1 } },
    });
    if (acquired.count !== 1) return null;
    const operation = await prisma.roadmap2DriveOperation.findUniqueOrThrow({ where: { id }, select });
    return record(operation);
  },

  async markProviderSucceeded(id, leaseToken, providerResult, now) {
    const updated = await prisma.roadmap2DriveOperation.updateMany({
      where: { id, status: "running", leaseToken },
      data: { status: "provider_succeeded", providerResult: providerResult as Prisma.InputJsonValue, providerAppliedAt: now },
    });
    if (updated.count !== 1) throw new Error("Le lease de l’opération Drive a expiré avant l’enregistrement du résultat fournisseur.");
  },

  async markSucceeded(id, leaseToken, result, now) {
    const updated = await prisma.roadmap2DriveOperation.updateMany({
      where: { id, status: { in: ["running", "provider_succeeded"] }, leaseToken, providerResult: { not: Prisma.DbNull } },
      data: { status: "succeeded", result: result as Prisma.InputJsonValue, completedAt: now, leaseToken: null, leaseExpiresAt: null, errorCode: null, errorMessage: null },
    });
    if (updated.count !== 1) throw new Error("La finalisation de l’opération Drive n’a pas pu être enregistrée.");
  },

  async markRetryable(id, leaseToken, errorCode, errorMessage, nextRetryAt) {
    await prisma.roadmap2DriveOperation.updateMany({
      where: { id, status: "running", leaseToken },
      data: { status: "retryable", errorCode, errorMessage, nextRetryAt, leaseToken: null, leaseExpiresAt: null },
    });
  },

  async markNeedsRepair(id, leaseToken, errorCode, errorMessage) {
    await prisma.roadmap2DriveOperation.updateMany({
      where: { id, status: { in: ["running", "provider_succeeded"] }, leaseToken },
      data: { status: "needs_repair", errorCode, errorMessage, leaseToken: null, leaseExpiresAt: null },
    });
  },
};

export const runRoadmap2DriveOperation = createRoadmap2DriveOperationRunner(roadmap2DriveOperationRepository);

export async function listRoadmap2DriveOperationsNeedingRepair(workspaceId?: string) {
  return prisma.roadmap2DriveOperation.findMany({
    where: { ...(workspaceId ? { workspaceId } : {}), status: { in: ["retryable", "needs_repair", "provider_succeeded"] } },
    select: { id: true, workspaceId: true, nodeId: true, operationType: true, status: true, attemptCount: true, errorCode: true, errorMessage: true, nextRetryAt: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  });
}

export async function getRoadmap2DriveOperationForRepair(operationId: string) {
  return prisma.roadmap2DriveOperation.findUnique({
    where: { id: operationId },
    select: {
      id: true,
      workspaceId: true,
      nodeId: true,
      actorUserId: true,
      operationType: true,
      status: true,
      idempotencyKey: true,
      requestHash: true,
      payload: true,
      providerResult: true,
    },
  });
}
