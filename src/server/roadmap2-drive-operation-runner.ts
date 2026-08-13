import { createHash, randomUUID } from "node:crypto";

export const ROADMAP2_DRIVE_OPERATION_TYPES = [
  "provision_workspace",
  "create_node_resources",
  "upload_node_file",
  "reconcile_node_layout",
  "sync_permissions",
  "archive_node",
  "restore_node",
  "update_node_structure",
] as const;

export type Roadmap2DriveOperationType = (typeof ROADMAP2_DRIVE_OPERATION_TYPES)[number];
export type Roadmap2DriveOperationStatus = "pending" | "running" | "provider_succeeded" | "succeeded" | "retryable" | "needs_repair" | "failed";
export type Roadmap2DriveOperationJson = Record<string, unknown>;

export type Roadmap2DriveOperationRecord = {
  id: string;
  workspaceId: string;
  nodeId: string | null;
  operationType: Roadmap2DriveOperationType;
  status: Roadmap2DriveOperationStatus;
  idempotencyKey: string;
  requestHash: string;
  providerResult: Roadmap2DriveOperationJson | null;
  result: Roadmap2DriveOperationJson | null;
  attemptCount: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  nextRetryAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type Roadmap2DriveOperationBeginInput = {
  workspaceId: string;
  nodeId: string | null;
  actorUserId: string;
  operationType: Roadmap2DriveOperationType;
  idempotencyKey: string;
  requestHash: string;
  payload: Roadmap2DriveOperationJson;
};

export type Roadmap2DriveOperationRepository = {
  begin(input: Roadmap2DriveOperationBeginInput): Promise<Roadmap2DriveOperationRecord>;
  acquire(id: string, leaseToken: string, now: Date, leaseExpiresAt: Date): Promise<Roadmap2DriveOperationRecord | null>;
  markProviderSucceeded(id: string, leaseToken: string, providerResult: Roadmap2DriveOperationJson, now: Date): Promise<void>;
  markSucceeded(id: string, leaseToken: string, result: Roadmap2DriveOperationJson, now: Date): Promise<void>;
  markRetryable(id: string, leaseToken: string, errorCode: string, errorMessage: string, nextRetryAt: Date): Promise<void>;
  markNeedsRepair(id: string, leaseToken: string, errorCode: string, errorMessage: string): Promise<void>;
};

export class Roadmap2DriveOperationConflictError extends Error {
  constructor(message = "Cette clé d’idempotence est déjà utilisée pour une autre opération Drive.") {
    super(message);
    this.name = "Roadmap2DriveOperationConflictError";
  }
}

export class Roadmap2DriveOperationInProgressError extends Error {
  constructor() {
    super("Cette opération Google Drive est déjà en cours. Réessayez dans quelques instants.");
    this.name = "Roadmap2DriveOperationInProgressError";
  }
}

export class Roadmap2DriveOperationRepairRequiredError extends Error {
  constructor(message = "Google Drive a accepté l’opération, mais sa finalisation locale doit être réparée.") {
    super(message);
    this.name = "Roadmap2DriveOperationRepairRequiredError";
  }
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`).join(",")}}`;
}

export function roadmap2DriveRequestHash(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function sanitizeRoadmap2DriveOperationError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Erreur Drive inconnue.";
  return raw
    .replace(/https?:\/\/\S+/gi, "[url masquée]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email masqué]")
    .replace(/(token|secret|api[_-]?key)\s*[:=]\s*\S+/gi, "$1=[masqué]")
    .slice(0, 500);
}

function assertCompatible(existing: Roadmap2DriveOperationRecord, input: Roadmap2DriveOperationBeginInput) {
  if (existing.operationType !== input.operationType || existing.requestHash !== input.requestHash || existing.nodeId !== input.nodeId) {
    throw new Roadmap2DriveOperationConflictError();
  }
}

export function createRoadmap2DriveOperationRunner(repository: Roadmap2DriveOperationRepository, options: { leaseMs?: number; now?: () => Date; leaseToken?: () => string } = {}) {
  const leaseMs = options.leaseMs ?? 120_000;
  const now = options.now ?? (() => new Date());
  const leaseToken = options.leaseToken ?? randomUUID;

  return async function runRoadmap2DriveOperation<TProvider extends Roadmap2DriveOperationJson, TResult extends Roadmap2DriveOperationJson>(input: Roadmap2DriveOperationBeginInput & {
    executeProvider: (context: { operationId: string; attempt: number }) => Promise<TProvider>;
    finalize: (providerResult: TProvider, context: { operationId: string; attempt: number }) => Promise<TResult>;
  }): Promise<{ operationId: string; replayed: boolean; result: TResult }> {
    const existing = await repository.begin(input);
    assertCompatible(existing, input);
    if (existing.status === "succeeded") {
      if (!existing.result) throw new Roadmap2DriveOperationRepairRequiredError("L’opération est marquée terminée sans résultat récupérable.");
      return { operationId: existing.id, replayed: true, result: existing.result as TResult };
    }
    if (existing.status === "failed") throw new Roadmap2DriveOperationRepairRequiredError(existing.errorMessage ?? undefined);

    const token = leaseToken();
    const acquiredAt = now();
    const acquired = await repository.acquire(existing.id, token, acquiredAt, new Date(acquiredAt.getTime() + leaseMs));
    if (!acquired) throw new Roadmap2DriveOperationInProgressError();
    const context = { operationId: acquired.id, attempt: acquired.attemptCount };

    let providerResult = acquired.providerResult as TProvider | null;
    if (!providerResult) {
      try {
        providerResult = await input.executeProvider(context);
      } catch (error) {
        const message = sanitizeRoadmap2DriveOperationError(error);
        const retryAt = new Date(now().getTime() + Math.min(60_000, 1_000 * (2 ** Math.min(acquired.attemptCount, 6))));
        await repository.markRetryable(acquired.id, token, error instanceof Error ? error.name : "PROVIDER_ERROR", message, retryAt);
        throw error;
      }
      await repository.markProviderSucceeded(acquired.id, token, providerResult, now());
    }

    let result: TResult;
    try {
      result = await input.finalize(providerResult, context);
    } catch (error) {
      const message = sanitizeRoadmap2DriveOperationError(error);
      await repository.markNeedsRepair(acquired.id, token, error instanceof Error ? error.name : "FINALIZE_ERROR", message);
      throw new Roadmap2DriveOperationRepairRequiredError(message);
    }
    try {
      await repository.markSucceeded(acquired.id, token, result, now());
    } catch (error) {
      const message = sanitizeRoadmap2DriveOperationError(error);
      await repository.markNeedsRepair(acquired.id, token, error instanceof Error ? error.name : "LEDGER_FINALIZE_ERROR", message);
      throw new Roadmap2DriveOperationRepairRequiredError(message);
    }
    return { operationId: acquired.id, replayed: false, result };
  };
}
