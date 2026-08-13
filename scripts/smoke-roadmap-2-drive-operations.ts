import assert from "node:assert/strict";
import {
  Roadmap2DriveOperationConflictError,
  Roadmap2DriveOperationInProgressError,
  Roadmap2DriveOperationRepairRequiredError,
  createRoadmap2DriveOperationRunner,
  roadmap2DriveRequestHash,
  sanitizeRoadmap2DriveOperationError,
  type Roadmap2DriveOperationBeginInput,
  type Roadmap2DriveOperationRecord,
  type Roadmap2DriveOperationRepository,
} from "../src/server/roadmap2-drive-operation-runner";

class MemoryRepository implements Roadmap2DriveOperationRepository {
  readonly rows = new Map<string, Roadmap2DriveOperationRecord>();
  failFinalizeWrite = false;

  async begin(input: Roadmap2DriveOperationBeginInput) {
    const existing = [...this.rows.values()].find((row) => row.workspaceId === input.workspaceId && row.idempotencyKey === input.idempotencyKey);
    if (existing) return { ...existing };
    const row: Roadmap2DriveOperationRecord = {
      id: `operation-${this.rows.size + 1}`,
      workspaceId: input.workspaceId,
      nodeId: input.nodeId,
      operationType: input.operationType,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      providerResult: null,
      result: null,
      attemptCount: 0,
      leaseToken: null,
      leaseExpiresAt: null,
      nextRetryAt: null,
      errorCode: null,
      errorMessage: null,
    };
    this.rows.set(row.id, row);
    return { ...row };
  }

  async acquire(id: string, leaseToken: string, now: Date, leaseExpiresAt: Date) {
    const row = this.rows.get(id)!;
    const available = row.status === "pending"
      || row.status === "needs_repair"
      || row.status === "provider_succeeded"
      || (row.status === "retryable" && (!row.nextRetryAt || row.nextRetryAt <= now))
      || (row.status === "running" && Boolean(row.leaseExpiresAt && row.leaseExpiresAt <= now));
    if (!available) return null;
    Object.assign(row, { status: "running", leaseToken, leaseExpiresAt, nextRetryAt: null, attemptCount: row.attemptCount + 1 });
    return { ...row };
  }

  async markProviderSucceeded(id: string, leaseToken: string, providerResult: Record<string, unknown>) {
    const row = this.rows.get(id)!;
    assert.equal(row.leaseToken, leaseToken);
    Object.assign(row, { status: "provider_succeeded", providerResult });
  }

  async markSucceeded(id: string, leaseToken: string, result: Record<string, unknown>) {
    if (this.failFinalizeWrite) {
      this.failFinalizeWrite = false;
      throw new Error("simulated ledger write failure");
    }
    const row = this.rows.get(id)!;
    assert.equal(row.leaseToken, leaseToken);
    assert.ok(row.providerResult);
    Object.assign(row, { status: "succeeded", result, leaseToken: null, leaseExpiresAt: null });
  }

  async markRetryable(id: string, leaseToken: string, errorCode: string, errorMessage: string, nextRetryAt: Date) {
    const row = this.rows.get(id)!;
    assert.equal(row.leaseToken, leaseToken);
    Object.assign(row, { status: "retryable", errorCode, errorMessage, nextRetryAt, leaseToken: null, leaseExpiresAt: null });
  }

  async markNeedsRepair(id: string, leaseToken: string, errorCode: string, errorMessage: string) {
    const row = this.rows.get(id)!;
    assert.equal(row.leaseToken, leaseToken);
    Object.assign(row, { status: "needs_repair", errorCode, errorMessage, leaseToken: null, leaseExpiresAt: null });
  }
}

async function main() {
const repository = new MemoryRepository();
let clock = new Date("2026-08-12T20:00:00.000Z");
let tokens = 0;
const run = createRoadmap2DriveOperationRunner(repository, { now: () => clock, leaseToken: () => `lease-${++tokens}` });
const base = {
  workspaceId: "workspace-1",
  nodeId: "node-1",
  actorUserId: "actor-1",
  operationType: "upload_node_file" as const,
  idempotencyKey: "upload_client-operation-1",
  requestHash: roadmap2DriveRequestHash({ file: "proof.pdf", digest: "abc" }),
  payload: { name: "proof.pdf", digest: "abc" },
};

let providerCalls = 0;
let finalizeCalls = 0;
let failProvider = true;
const executeProvider = async () => {
  providerCalls += 1;
  if (failProvider) throw new Error("token=secret-value https://private.example user@example.com");
  return { fileId: "drive-file-1" };
};
const finalize = async (providerResult: { fileId: string }) => {
  finalizeCalls += 1;
  return { fileId: providerResult.fileId, audited: true };
};

await assert.rejects(() => run({ ...base, executeProvider, finalize }), /private\.example/);
const retryable = repository.rows.get("operation-1")!;
assert.equal(retryable.status, "retryable");
assert.ok(!retryable.errorMessage?.includes("secret-value") && !retryable.errorMessage?.includes("user@example.com") && !retryable.errorMessage?.includes("private.example"));
await assert.rejects(() => run({ ...base, executeProvider, finalize }), Roadmap2DriveOperationInProgressError);

clock = new Date(clock.getTime() + 5_000);
failProvider = false;
repository.failFinalizeWrite = true;
await assert.rejects(() => run({ ...base, executeProvider, finalize }), Roadmap2DriveOperationRepairRequiredError);
assert.equal(repository.rows.get("operation-1")!.status, "needs_repair");

clock = new Date(clock.getTime() + 1);
const recovered = await run({ ...base, executeProvider, finalize });
assert.deepEqual(recovered.result, { fileId: "drive-file-1", audited: true });
assert.equal(providerCalls, 2, "La reprise après succès fournisseur ne doit pas rappeler Google Drive.");
assert.equal(finalizeCalls, 2, "La finalisation locale doit être rejouable.");

const replayed = await run({ ...base, executeProvider, finalize });
assert.equal(replayed.replayed, true);
assert.equal(providerCalls, 2);
assert.equal(finalizeCalls, 2);

await assert.rejects(() => run({ ...base, requestHash: roadmap2DriveRequestHash({ file: "other.pdf" }), executeProvider, finalize }), Roadmap2DriveOperationConflictError);

const repairRepository = new MemoryRepository();
const repairRun = createRoadmap2DriveOperationRunner(repairRepository, { now: () => clock, leaseToken: () => `repair-${++tokens}` });
let repairFinalizeCalls = 0;
await assert.rejects(() => repairRun({
  ...base,
  idempotencyKey: "upload_client-operation-2",
  executeProvider: async () => ({ fileId: "drive-file-2" }),
  finalize: async () => {
    repairFinalizeCalls += 1;
    throw new Error("database unavailable");
  },
}), Roadmap2DriveOperationRepairRequiredError);
assert.equal(repairRepository.rows.get("operation-1")!.status, "needs_repair");
const repaired = await repairRun({
  ...base,
  idempotencyKey: "upload_client-operation-2",
  executeProvider: async (): Promise<{ fileId: string }> => { throw new Error("provider must not be called"); },
  finalize: async (providerResult) => ({ recovered: providerResult.fileId }),
});
assert.deepEqual(repaired.result, { recovered: "drive-file-2" });
assert.equal(repairFinalizeCalls, 1);

const concurrentRepository = new MemoryRepository();
const concurrentBase = { ...base, idempotencyKey: "upload_client-operation-3" };
const concurrentRow = await concurrentRepository.begin(concurrentBase);
const held = await concurrentRepository.acquire(concurrentRow.id, "held-lease", clock, new Date(clock.getTime() + 120_000));
assert.ok(held);
const concurrentRun = createRoadmap2DriveOperationRunner(concurrentRepository, { now: () => clock, leaseToken: () => "contending-lease" });
await assert.rejects(() => concurrentRun({ ...concurrentBase, executeProvider, finalize }), Roadmap2DriveOperationInProgressError);

const sanitized = sanitizeRoadmap2DriveOperationError(new Error("api_key=abc token:xyz jane@example.com https://example.test/x"));
assert.equal(sanitized.includes("abc") || sanitized.includes("xyz") || sanitized.includes("jane@example.com") || sanitized.includes("example.test"), false);

console.log(JSON.stringify({ status: "pass", suite: "roadmap_2_drive_operations", providerCalls, finalizeCalls }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
