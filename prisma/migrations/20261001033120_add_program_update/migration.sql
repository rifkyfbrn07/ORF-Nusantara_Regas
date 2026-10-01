-- CreateEnum
CREATE TYPE "ProgramUpdateStatus" AS ENUM ('DRAFT', 'TERKIRIM', 'DIVERIFIKASI', 'DITOLAK');

-- CreateTable
CREATE TABLE "ProgramUpdate" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "userId" TEXT,
    "period" TEXT,
    "notes" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "fileUrl" TEXT,
    "driveFileId" TEXT,
    "driveWebViewLink" TEXT,
    "storageProvider" TEXT,
    "storagePath" TEXT,
    "status" "ProgramUpdateStatus" NOT NULL DEFAULT 'TERKIRIM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramUpdate_programId_idx" ON "ProgramUpdate"("programId");

-- CreateIndex
CREATE INDEX "ProgramUpdate_userId_idx" ON "ProgramUpdate"("userId");

-- CreateIndex
CREATE INDEX "ProgramUpdate_status_idx" ON "ProgramUpdate"("status");

-- AddForeignKey
ALTER TABLE "ProgramUpdate" ADD CONSTRAINT "ProgramUpdate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramUpdate" ADD CONSTRAINT "ProgramUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
