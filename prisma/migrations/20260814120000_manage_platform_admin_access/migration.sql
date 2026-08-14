CREATE TABLE "PlatformAdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "before" JSONB NOT NULL,
  "after" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformAdminAuditLog_actorUserId_createdAt_idx"
  ON "PlatformAdminAuditLog"("actorUserId", "createdAt");
CREATE INDEX "PlatformAdminAuditLog_targetUserId_createdAt_idx"
  ON "PlatformAdminAuditLog"("targetUserId", "createdAt");
CREATE INDEX "PlatformAdminAuditLog_createdAt_idx"
  ON "PlatformAdminAuditLog"("createdAt");

ALTER TABLE "PlatformAdminAuditLog"
  ADD CONSTRAINT "PlatformAdminAuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlatformAdminAuditLog"
  ADD CONSTRAINT "PlatformAdminAuditLog_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Aucun accès direct PostgREST : les mutations passent exclusivement par
-- requirePlatformAdmin() puis par la transaction Prisma auditée.
ALTER TABLE "PlatformAdminAuditLog" ENABLE ROW LEVEL SECURITY;
