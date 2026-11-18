CREATE TABLE "QuestionnaireResponse" (
  "id" TEXT NOT NULL,
  "submissionKey" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "sectorDetail" TEXT,
  "firstName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "contactSlot" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuestionnaireResponse_status_check" CHECK ("status" IN ('NEW', 'IN_PROGRESS', 'DONE'))
);
CREATE UNIQUE INDEX "QuestionnaireResponse_submissionKey_key" ON "QuestionnaireResponse"("submissionKey");
CREATE INDEX "QuestionnaireResponse_createdAt_idx" ON "QuestionnaireResponse"("createdAt");
CREATE INDEX "QuestionnaireResponse_status_createdAt_idx" ON "QuestionnaireResponse"("status", "createdAt");
CREATE INDEX "QuestionnaireResponse_expiresAt_idx" ON "QuestionnaireResponse"("expiresAt");
ALTER TABLE "QuestionnaireResponse" ENABLE ROW LEVEL SECURITY;
