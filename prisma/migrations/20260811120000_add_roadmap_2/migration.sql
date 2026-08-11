-- Roadmap 2 is intentionally additive and does not alter RoadmapMilestone.
CREATE TYPE "Roadmap2NodeType" AS ENUM ('phase', 'milestone', 'initiative', 'action', 'decision');
CREATE TYPE "Roadmap2Category" AS ENUM ('strategy_governance', 'product_pedagogy', 'buyers_funding', 'partners_market', 'operations_compliance', 'technology_data', 'pilot_execution');
CREATE TYPE "Roadmap2Status" AS ENUM ('not_started', 'in_progress', 'blocked', 'review', 'completed', 'archived');
CREATE TYPE "Roadmap2Priority" AS ENUM ('P0', 'P1', 'P2');
CREATE TYPE "Roadmap2RelationType" AS ENUM ('dependency', 'parent_child', 'blocks', 'contributes_to');
CREATE TYPE "Roadmap2UpdateType" AS ENUM ('progress', 'decision', 'blocker', 'note', 'validation');

CREATE TABLE "Roadmap2Workspace" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rootDriveUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Roadmap2Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Roadmap2Node" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "expectedOutcome" TEXT,
    "type" "Roadmap2NodeType" NOT NULL,
    "category" "Roadmap2Category" NOT NULL,
    "status" "Roadmap2Status" NOT NULL DEFAULT 'not_started',
    "priority" "Roadmap2Priority" NOT NULL DEFAULT 'P1',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "decisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "definitionOfDone" TEXT,
    "driveFolderUrl" TEXT,
    "trackingDocUrl" TEXT,
    "parentId" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION,
    "seedKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "Roadmap2Node_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Roadmap2Edge" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationType" "Roadmap2RelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "Roadmap2Edge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Roadmap2Update" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "updateType" "Roadmap2UpdateType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "Roadmap2Update_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Roadmap2AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Roadmap2AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Roadmap2Workspace_key_key" ON "Roadmap2Workspace"("key");
CREATE UNIQUE INDEX "Roadmap2Node_workspaceId_seedKey_key" ON "Roadmap2Node"("workspaceId", "seedKey");
CREATE INDEX "Roadmap2Node_workspaceId_archivedAt_idx" ON "Roadmap2Node"("workspaceId", "archivedAt");
CREATE INDEX "Roadmap2Node_workspaceId_status_idx" ON "Roadmap2Node"("workspaceId", "status");
CREATE INDEX "Roadmap2Node_workspaceId_category_idx" ON "Roadmap2Node"("workspaceId", "category");
CREATE INDEX "Roadmap2Node_workspaceId_ownerUserId_idx" ON "Roadmap2Node"("workspaceId", "ownerUserId");
CREATE INDEX "Roadmap2Node_parentId_idx" ON "Roadmap2Node"("parentId");
CREATE UNIQUE INDEX "Roadmap2Edge_workspaceId_sourceNodeId_targetNodeId_relationType_key" ON "Roadmap2Edge"("workspaceId", "sourceNodeId", "targetNodeId", "relationType");
CREATE INDEX "Roadmap2Edge_workspaceId_sourceNodeId_idx" ON "Roadmap2Edge"("workspaceId", "sourceNodeId");
CREATE INDEX "Roadmap2Edge_workspaceId_targetNodeId_idx" ON "Roadmap2Edge"("workspaceId", "targetNodeId");
CREATE INDEX "Roadmap2Update_workspaceId_nodeId_createdAt_idx" ON "Roadmap2Update"("workspaceId", "nodeId", "createdAt");
CREATE INDEX "Roadmap2AuditLog_workspaceId_createdAt_idx" ON "Roadmap2AuditLog"("workspaceId", "createdAt");
CREATE INDEX "Roadmap2AuditLog_entityType_entityId_idx" ON "Roadmap2AuditLog"("entityType", "entityId");

ALTER TABLE "Roadmap2Node" ADD CONSTRAINT "Roadmap2Node_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Node" ADD CONSTRAINT "Roadmap2Node_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Node" ADD CONSTRAINT "Roadmap2Node_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Node" ADD CONSTRAINT "Roadmap2Node_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Node" ADD CONSTRAINT "Roadmap2Node_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Roadmap2Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Edge" ADD CONSTRAINT "Roadmap2Edge_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Edge" ADD CONSTRAINT "Roadmap2Edge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "Roadmap2Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Edge" ADD CONSTRAINT "Roadmap2Edge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "Roadmap2Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Edge" ADD CONSTRAINT "Roadmap2Edge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Update" ADD CONSTRAINT "Roadmap2Update_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Update" ADD CONSTRAINT "Roadmap2Update_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Roadmap2Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2Update" ADD CONSTRAINT "Roadmap2Update_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Roadmap2AuditLog" ADD CONSTRAINT "Roadmap2AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Roadmap2Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Roadmap2AuditLog" ADD CONSTRAINT "Roadmap2AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Supabase/PostgREST roles receive no direct Roadmap 2 policy. The application
-- accesses these private tables only through the trusted Prisma backend role,
-- after its own admin/workspace authorization checks.
ALTER TABLE "Roadmap2Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Roadmap2Node" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Roadmap2Edge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Roadmap2Update" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Roadmap2AuditLog" ENABLE ROW LEVEL SECURITY;
