-- CreateTable
CREATE TABLE "SessionModuleAssignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "trainerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionModuleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionModuleAssignment_sessionId_moduleId_key" ON "SessionModuleAssignment"("sessionId", "moduleId");

-- CreateIndex
CREATE INDEX "SessionModuleAssignment_organizationId_idx" ON "SessionModuleAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "SessionModuleAssignment_sessionId_idx" ON "SessionModuleAssignment"("sessionId");

-- CreateIndex
CREATE INDEX "SessionModuleAssignment_moduleId_idx" ON "SessionModuleAssignment"("moduleId");

-- CreateIndex
CREATE INDEX "SessionModuleAssignment_trainerId_idx" ON "SessionModuleAssignment"("trainerId");

-- AddForeignKey
ALTER TABLE "SessionModuleAssignment" ADD CONSTRAINT "SessionModuleAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionModuleAssignment" ADD CONSTRAINT "SessionModuleAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "FormationModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionModuleAssignment" ADD CONSTRAINT "SessionModuleAssignment_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
