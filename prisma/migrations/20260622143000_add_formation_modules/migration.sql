-- Formation modules: structured pedagogical breakdown + module-level trainer eligibility.
CREATE TABLE "FormationModule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "formationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "durationDays" INTEGER,
  "durationHours" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FormationModule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormationModuleTrainer" (
  "moduleId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,

  CONSTRAINT "FormationModuleTrainer_pkey" PRIMARY KEY ("moduleId", "trainerId")
);

CREATE INDEX "FormationModule_organizationId_idx" ON "FormationModule"("organizationId");
CREATE INDEX "FormationModule_formationId_idx" ON "FormationModule"("formationId");
CREATE INDEX "FormationModuleTrainer_trainerId_idx" ON "FormationModuleTrainer"("trainerId");

ALTER TABLE "FormationModule"
  ADD CONSTRAINT "FormationModule_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormationModule"
  ADD CONSTRAINT "FormationModule_formationId_fkey"
  FOREIGN KEY ("formationId") REFERENCES "Formation"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormationModuleTrainer"
  ADD CONSTRAINT "FormationModuleTrainer_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "FormationModule"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FormationModuleTrainer"
  ADD CONSTRAINT "FormationModuleTrainer_trainerId_fkey"
  FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
