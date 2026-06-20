-- Add document completion metadata and template lifecycle/default support.
CREATE TYPE "DocumentCompletionStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'DRAFT');
CREATE TYPE "DocumentTemplateStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');

ALTER TABLE "DocumentTemplate"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "variablesDetected" JSONB,
  ADD COLUMN "variableMappings" JSONB,
  ADD COLUMN "createdById" TEXT;

ALTER TABLE "Document"
  ADD COLUMN "templateVersion" INTEGER,
  ADD COLUMN "completionStatus" "DocumentCompletionStatus" NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN "completionScore" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "missingVariables" JSONB,
  ADD COLUMN "generationContextSnapshot" JSONB,
  ADD COLUMN "manualOverrides" JSONB,
  ADD COLUMN "finalizedAt" TIMESTAMP(3);

CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX "DocumentTemplate_status_idx" ON "DocumentTemplate"("status");
CREATE INDEX "Document_completionStatus_idx" ON "Document"("completionStatus");

ALTER TABLE "DocumentTemplate"
  ADD CONSTRAINT "DocumentTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
