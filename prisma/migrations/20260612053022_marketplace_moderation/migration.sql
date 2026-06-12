-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "marketplaceRejectionReason" TEXT,
ADD COLUMN     "marketplaceReviewedAt" TIMESTAMP(3),
ADD COLUMN     "marketplaceReviewedBy" TEXT,
ADD COLUMN     "marketplaceStatus" "MarketplaceStatus" NOT NULL DEFAULT 'PENDING';
