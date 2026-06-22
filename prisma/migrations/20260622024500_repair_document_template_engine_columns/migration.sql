DO $$
BEGIN
  CREATE TYPE "DocumentCompletionStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentTemplateStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DRAFT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "DocumentTemplate"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "engine" TEXT NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS "sourceFileUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "status" "DocumentTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "variablesDetected" JSONB,
  ADD COLUMN IF NOT EXISTS "variableMappings" JSONB,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

ALTER TABLE "Document"
  ADD COLUMN IF NOT EXISTS "fileName" TEXT,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER,
  ADD COLUMN IF NOT EXISTS "completionStatus" "DocumentCompletionStatus" NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN IF NOT EXISTS "completionScore" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "missingVariables" JSONB,
  ADD COLUMN IF NOT EXISTS "generationContextSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "manualOverrides" JSONB,
  ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_status_idx" ON "DocumentTemplate"("status");
CREATE INDEX IF NOT EXISTS "Document_completionStatus_idx" ON "Document"("completionStatus");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DocumentTemplate_createdById_fkey'
  ) THEN
    ALTER TABLE "DocumentTemplate"
      ADD CONSTRAINT "DocumentTemplate_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
