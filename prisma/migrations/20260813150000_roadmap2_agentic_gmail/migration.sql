CREATE TYPE "Roadmap2EmailOperationStatus" AS ENUM (
  'running',
  'provider_succeeded',
  'succeeded',
  'retryable',
  'needs_repair',
  'failed'
);

CREATE TABLE "Roadmap2EmailOperation" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "nodeId" TEXT,
  "actorUserId" TEXT,
  "status" "Roadmap2EmailOperationStatus" NOT NULL DEFAULT 'running',
  "idempotencyKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "providerMessageId" TEXT,
  "providerThreadId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "providerAppliedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Roadmap2EmailOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Roadmap2EmailOperation_workspaceId_idempotencyKey_key"
  ON "Roadmap2EmailOperation"("workspaceId", "idempotencyKey");
CREATE INDEX "Roadmap2EmailOperation_workspaceId_status_createdAt_idx"
  ON "Roadmap2EmailOperation"("workspaceId", "status", "createdAt");
CREATE INDEX "Roadmap2EmailOperation_nodeId_createdAt_idx"
  ON "Roadmap2EmailOperation"("nodeId", "createdAt");

ALTER TABLE "Roadmap2EmailOperation"
  ADD CONSTRAINT "Roadmap2EmailOperation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2EmailOperation"
  ADD CONSTRAINT "Roadmap2EmailOperation_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "Roadmap2Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2EmailOperation"
  ADD CONSTRAINT "Roadmap2EmailOperation_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Roadmap2EmailOperation" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "AgentApprovalUse" (
  "id" TEXT NOT NULL,
  "approvalId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "argsHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentApprovalUse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgentApprovalUse_approvalId_key" ON "AgentApprovalUse"("approvalId");
CREATE INDEX "AgentApprovalUse_actorUserId_createdAt_idx" ON "AgentApprovalUse"("actorUserId", "createdAt");
ALTER TABLE "AgentApprovalUse"
  ADD CONSTRAINT "AgentApprovalUse_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentApprovalUse" ENABLE ROW LEVEL SECURITY;
