-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "evidenceCleanupAt" TIMESTAMP(3),
ADD COLUMN     "evidenceCleanupStatus" TEXT;

-- AlterTable
ALTER TABLE "ShiftExchange" ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "evidenceCleanupAt" TIMESTAMP(3),
ADD COLUMN     "evidenceCleanupStatus" TEXT;
