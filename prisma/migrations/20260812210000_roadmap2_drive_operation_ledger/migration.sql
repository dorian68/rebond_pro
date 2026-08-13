CREATE TYPE "Roadmap2DriveOperationType" AS ENUM (
  'provision_workspace',
  'create_node_resources',
  'upload_node_file',
  'reconcile_node_layout',
  'sync_permissions',
  'archive_node',
  'restore_node'
);

CREATE TYPE "Roadmap2DriveOperationStatus" AS ENUM (
  'pending',
  'running',
  'provider_succeeded',
  'succeeded',
  'retryable',
  'needs_repair',
  'failed'
);

CREATE TABLE "Roadmap2DriveOperation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "nodeId" TEXT,
  "actorUserId" TEXT,
  "operationType" "Roadmap2DriveOperationType" NOT NULL,
  "status" "Roadmap2DriveOperationStatus" NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "providerResult" JSONB,
  "result" JSONB,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "nextRetryAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "providerAppliedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Roadmap2DriveOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Roadmap2DriveOperation_workspaceId_idempotencyKey_key"
  ON "Roadmap2DriveOperation"("workspaceId", "idempotencyKey");
CREATE INDEX "Roadmap2DriveOperation_workspaceId_status_nextRetryAt_idx"
  ON "Roadmap2DriveOperation"("workspaceId", "status", "nextRetryAt");
CREATE INDEX "Roadmap2DriveOperation_nodeId_createdAt_idx"
  ON "Roadmap2DriveOperation"("nodeId", "createdAt");

ALTER TABLE "Roadmap2DriveOperation"
  ADD CONSTRAINT "Roadmap2DriveOperation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2DriveOperation"
  ADD CONSTRAINT "Roadmap2DriveOperation_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "Roadmap2Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2DriveOperation"
  ADD CONSTRAINT "Roadmap2DriveOperation_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Roadmap2DriveOperation" ENABLE ROW LEVEL SECURITY;
