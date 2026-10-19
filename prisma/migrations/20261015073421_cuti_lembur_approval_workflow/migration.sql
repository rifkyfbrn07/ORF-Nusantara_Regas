-- AlterTable
-- Kolom lama `reviewerNote` di-rename menjadi `managerNote` (catatan keputusan final Manager),
-- agar data historis tetap terjaga (non-destructive rename).
ALTER TABLE "LeaveRequest" RENAME COLUMN "reviewerNote" TO "managerNote";

ALTER TABLE "LeaveRequest" ADD COLUMN     "approvalStage" TEXT NOT NULL DEFAULT 'REVIEWER',
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "managerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "managerName" TEXT,
ADD COLUMN     "reviewerApprovedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "reviewerName" TEXT,
ADD COLUMN     "teamLeadApprovedAt" TIMESTAMP(3),
ADD COLUMN     "teamLeadId" TEXT,
ADD COLUMN     "teamLeadName" TEXT,
ADD COLUMN     "teamLeadNote" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "joinedDate" TEXT,
ADD COLUMN     "team" TEXT;

-- CreateTable
CREATE TABLE "TeamConfig" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reviewerId" TEXT,
    "teamLeadId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamConfig_code_key" ON "TeamConfig"("code");

-- CreateIndex
CREATE INDEX "LeaveRequest_approvalStage_idx" ON "LeaveRequest"("approvalStage");
