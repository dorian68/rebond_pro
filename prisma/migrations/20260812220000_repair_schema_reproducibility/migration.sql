-- Répare les écarts historiques qui empêchaient un schéma vide et une base
-- baselinée de converger vers la même structure. Cette migration est conçue
-- pour être rejouable sur un clone avant toute application à la cible.

ALTER TYPE "Roadmap2DriveOperationType" ADD VALUE IF NOT EXISTS 'update_node_structure';

ALTER TABLE "SocrateLeadCapture" ALTER COLUMN "email" DROP NOT NULL;

DROP INDEX IF EXISTS "Prospect_public_dedup_key";
CREATE UNIQUE INDEX "Prospect_public_dedup_key"
  ON "Prospect"("organizationId", "formationOfInterestId", "email")
  WHERE "deletedAt" IS NULL
    AND "formationOfInterestId" IS NOT NULL
    AND "email" IS NOT NULL
    AND "stage" IN ('NOUVEAU', 'CONTACTE', 'DEVIS', 'RELANCE');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'PasswordResetToken_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'ChangeRequest_organizationId_fkey'
  ) THEN
    ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'ChangeRequest_trainerId_fkey'
  ) THEN
    ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_trainerId_fkey"
      FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'Beneficiary_organizationId_fkey'
  ) THEN
    ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'Beneficiary_userId_fkey'
  ) THEN
    ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'BilanStep_beneficiaryId_fkey'
  ) THEN
    ALTER TABLE "BilanStep" ADD CONSTRAINT "BilanStep_beneficiaryId_fkey"
      FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'Transaction_organizationId_fkey'
  ) THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'FormationInterest_beneficiaryId_fkey'
  ) THEN
    ALTER TABLE "FormationInterest" ADD CONSTRAINT "FormationInterest_beneficiaryId_fkey"
      FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = current_schema() AND con.conname = 'FormationInterest_formationId_fkey'
  ) THEN
    ALTER TABLE "FormationInterest" ADD CONSTRAINT "FormationInterest_formationId_fkey"
      FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- La base Supabase active applique déjà le RLS à toutes les tables métier.
-- Le backend Prisma utilise un rôle de confiance et les rôles PostgREST ne
-- reçoivent aucune policy permissive. Reproduire ce garde-fou sur un schéma neuf.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END
$$;
