-- Synchronise les évolutions historiquement appliquées à Supabase hors migrations.
-- Les clauses IF NOT EXISTS permettent aussi d'appliquer cette migration aux bases
-- où ces objets ont déjà été créés manuellement.

ALTER TYPE "AvailabilityType" ADD VALUE IF NOT EXISTS 'TENTATIVE';

ALTER TABLE "Formation"
  ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "modalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "publicEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "publicPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "publicProfileEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "socialLinks" JSONB,
  ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "tagline" TEXT;

ALTER TABLE "Trainer"
  ADD COLUMN IF NOT EXISTS "photoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "yearsExperience" INTEGER;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "platformAdmin" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChangeRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "sessionId" TEXT,
  "availabilityId" TEXT,
  "requestType" TEXT NOT NULL,
  "reason" TEXT,
  "proposedDate" TIMESTAMP(3),
  "proposedSlot" "Slot",
  "proposedStart" TEXT,
  "proposedEnd" TEXT,
  "urgency" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "centerResponse" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Beneficiary" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "objective" TEXT,
  "situation" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BilanStep" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "phase" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'todo',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "BilanStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "commission" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" TEXT NOT NULL DEFAULT 'paid',
  "stripeRef" TEXT,
  "payerEmail" TEXT,
  "payerName" TEXT,
  "formationId" TEXT,
  "beneficiaryId" TEXT,
  "enrollmentId" TEXT,
  "description" TEXT,
  "payoutStatus" TEXT NOT NULL DEFAULT 'pending',
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FormationInterest" (
  "id" TEXT NOT NULL,
  "beneficiaryId" TEXT NOT NULL,
  "formationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'saved',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FormationInterest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx"
  ON "PasswordResetToken"("userId");
CREATE INDEX IF NOT EXISTS "ChangeRequest_organizationId_idx"
  ON "ChangeRequest"("organizationId");
CREATE INDEX IF NOT EXISTS "ChangeRequest_trainerId_idx"
  ON "ChangeRequest"("trainerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Beneficiary_userId_key"
  ON "Beneficiary"("userId");
CREATE INDEX IF NOT EXISTS "Beneficiary_organizationId_idx"
  ON "Beneficiary"("organizationId");
CREATE INDEX IF NOT EXISTS "BilanStep_beneficiaryId_idx"
  ON "BilanStep"("beneficiaryId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_stripeRef_key"
  ON "Transaction"("stripeRef");
CREATE INDEX IF NOT EXISTS "Transaction_organizationId_idx"
  ON "Transaction"("organizationId");
CREATE INDEX IF NOT EXISTS "Transaction_type_idx"
  ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx"
  ON "Transaction"("createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_payoutStatus_idx"
  ON "Transaction"("payoutStatus");
CREATE INDEX IF NOT EXISTS "FormationInterest_beneficiaryId_idx"
  ON "FormationInterest"("beneficiaryId");
CREATE UNIQUE INDEX IF NOT EXISTS "FormationInterest_beneficiaryId_formationId_key"
  ON "FormationInterest"("beneficiaryId", "formationId");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key"
  ON "Organization"("stripeCustomerId");

CREATE UNIQUE INDEX IF NOT EXISTS "Prospect_public_dedup_key"
  ON "Prospect"("organizationId", "formationOfInterestId", "email")
  WHERE "deletedAt" IS NULL
    AND "formationOfInterestId" IS NOT NULL
    AND "email" IS NOT NULL
    AND "stage" IN ('NOUVEAU', 'CONTACTE', 'DEVIS', 'RELANCE');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey') THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChangeRequest_organizationId_fkey') THEN
    ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChangeRequest_trainerId_fkey') THEN
    ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_trainerId_fkey"
      FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Beneficiary_organizationId_fkey') THEN
    ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Beneficiary_userId_fkey') THEN
    ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BilanStep_beneficiaryId_fkey') THEN
    ALTER TABLE "BilanStep" ADD CONSTRAINT "BilanStep_beneficiaryId_fkey"
      FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_organizationId_fkey') THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormationInterest_beneficiaryId_fkey') THEN
    ALTER TABLE "FormationInterest" ADD CONSTRAINT "FormationInterest_beneficiaryId_fkey"
      FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormationInterest_formationId_fkey') THEN
    ALTER TABLE "FormationInterest" ADD CONSTRAINT "FormationInterest_formationId_fkey"
      FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
