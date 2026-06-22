-- CreateTable
CREATE TABLE "RoadmapMilestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "category" TEXT,
    "ownerName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByEmail" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapMilestone_status_idx" ON "RoadmapMilestone"("status");

-- CreateIndex
CREATE INDEX "RoadmapMilestone_sortOrder_idx" ON "RoadmapMilestone"("sortOrder");
