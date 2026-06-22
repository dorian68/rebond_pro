CREATE TABLE "BilanArtifact" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "stepId" TEXT,
  "key" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'admin',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "shareable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BilanArtifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BilanArtifact_beneficiaryId_key_key" ON "BilanArtifact"("beneficiaryId", "key");
CREATE INDEX "BilanArtifact_beneficiaryId_idx" ON "BilanArtifact"("beneficiaryId");
CREATE INDEX "BilanArtifact_stepId_idx" ON "BilanArtifact"("stepId");
CREATE INDEX "BilanArtifact_kind_idx" ON "BilanArtifact"("kind");
CREATE INDEX "BilanArtifact_status_idx" ON "BilanArtifact"("status");

ALTER TABLE "BilanArtifact"
  ADD CONSTRAINT "BilanArtifact_beneficiaryId_fkey"
  FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BilanArtifact"
  ADD CONSTRAINT "BilanArtifact_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "BilanStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
