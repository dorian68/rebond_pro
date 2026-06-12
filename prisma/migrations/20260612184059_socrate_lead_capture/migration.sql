-- CreateTable
CREATE TABLE "SocrateLeadCapture" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "profileType" TEXT,
    "intent" TEXT,
    "message" TEXT,
    "conversationSummary" TEXT,
    "source" TEXT NOT NULL DEFAULT 'socrate_chatbot',
    "status" TEXT NOT NULL DEFAULT 'new',
    "internalEmailSentAt" TIMESTAMP(3),

    CONSTRAINT "SocrateLeadCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocrateAssessmentLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "uploadedFileName" TEXT,
    "assessmentSummary" TEXT,
    "fullAssessment" TEXT,
    "recommendedTrainings" JSONB,
    "emailSentAt" TIMESTAMP(3),

    CONSTRAINT "SocrateAssessmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocrateLeadCapture_email_idx" ON "SocrateLeadCapture"("email");

-- CreateIndex
CREATE INDEX "SocrateLeadCapture_createdAt_idx" ON "SocrateLeadCapture"("createdAt");

-- CreateIndex
CREATE INDEX "SocrateLeadCapture_status_idx" ON "SocrateLeadCapture"("status");

-- CreateIndex
CREATE INDEX "SocrateAssessmentLog_userEmail_idx" ON "SocrateAssessmentLog"("userEmail");

-- CreateIndex
CREATE INDEX "SocrateAssessmentLog_createdAt_idx" ON "SocrateAssessmentLog"("createdAt");
