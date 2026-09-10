-- AlterTable: LeaveRequest bukti surat cuti (Google Drive reference)
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER,
ADD COLUMN IF NOT EXISTS "driveFileId" TEXT,
ADD COLUMN IF NOT EXISTS "driveWebViewLink" TEXT,
ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3);

-- CreateTable: OperationalReport (laporan operasional + bukti Google Drive)
CREATE TABLE IF NOT EXISTS "OperationalReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "periodDate" TEXT NOT NULL,
    "departmentId" TEXT,
    "description" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentMime" TEXT,
    "attachmentSize" INTEGER,
    "driveFileId" TEXT,
    "driveWebViewLink" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OperationalReport_reportType_idx" ON "OperationalReport"("reportType");
CREATE INDEX IF NOT EXISTS "OperationalReport_periodDate_idx" ON "OperationalReport"("periodDate");
CREATE INDEX IF NOT EXISTS "OperationalReport_uploadedById_idx" ON "OperationalReport"("uploadedById");

-- AddForeignKey (idempotent guard: DB may already have them via db push)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperationalReport_departmentId_fkey') THEN
    ALTER TABLE "OperationalReport" ADD CONSTRAINT "OperationalReport_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OperationalReport_uploadedById_fkey') THEN
    ALTER TABLE "OperationalReport" ADD CONSTRAINT "OperationalReport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;