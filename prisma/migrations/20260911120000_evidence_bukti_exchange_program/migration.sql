-- AlterTable: ShiftExchange bukti/surat persetujuan + target acceptance
ALTER TABLE "ShiftExchange" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentName" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT,
ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER,
ADD COLUMN IF NOT EXISTS "driveFileId" TEXT,
ADD COLUMN IF NOT EXISTS "driveWebViewLink" TEXT,
ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "targetAcceptedAt" TIMESTAMP(3);

-- AlterTable: ProgramKerja evidence (Google Drive reference)
ALTER TABLE "ProgramKerja" ADD COLUMN IF NOT EXISTS "evidenceUrl" TEXT,
ADD COLUMN IF NOT EXISTS "evidenceName" TEXT,
ADD COLUMN IF NOT EXISTS "evidenceMime" TEXT,
ADD COLUMN IF NOT EXISTS "evidenceSize" INTEGER,
ADD COLUMN IF NOT EXISTS "driveFileId" TEXT,
ADD COLUMN IF NOT EXISTS "driveWebViewLink" TEXT;

-- CreateTable: ProgramKerjaProgressLog (history progress + evidence)
CREATE TABLE IF NOT EXISTS "ProgramKerjaProgressLog" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "oldProgress" INTEGER NOT NULL DEFAULT 0,
    "newProgress" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "evidenceUrl" TEXT,
    "evidenceName" TEXT,
    "evidenceMime" TEXT,
    "evidenceSize" INTEGER,
    "driveFileId" TEXT,
    "driveWebViewLink" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramKerjaProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProgramKerjaProgressLog_programId_idx" ON "ProgramKerjaProgressLog"("programId");
CREATE INDEX IF NOT EXISTS "ProgramKerjaProgressLog_userId_idx" ON "ProgramKerjaProgressLog"("userId");

-- AddForeignKey (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramKerjaProgressLog_programId_fkey') THEN
    ALTER TABLE "ProgramKerjaProgressLog" ADD CONSTRAINT "ProgramKerjaProgressLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProgramKerjaProgressLog_userId_fkey') THEN
    ALTER TABLE "ProgramKerjaProgressLog" ADD CONSTRAINT "ProgramKerjaProgressLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;