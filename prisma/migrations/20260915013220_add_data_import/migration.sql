/*
  Warnings:

  - Made the column `targetScheduleId` on table `ShiftExchange` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ImportDocumentType" AS ENUM ('PROGRAM_KERJA', 'JADWAL_KERJA');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- DropIndex
DROP INDEX "ShiftExchange_targetScheduleId_idx";

-- AlterTable
ALTER TABLE "ProgramKerjaMonth" ALTER COLUMN "target" DROP NOT NULL,
ALTER COLUMN "target" DROP DEFAULT,
ALTER COLUMN "realization" DROP NOT NULL,
ALTER COLUMN "realization" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ShiftExchange" ALTER COLUMN "targetScheduleId" SET NOT NULL;

-- CreateTable
CREATE TABLE "DataImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "documentType" "ImportDocumentType" NOT NULL DEFAULT 'PROGRAM_KERJA',
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "sheetNames" JSONB,
    "year" INTEGER,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "planRecords" INTEGER NOT NULL DEFAULT 0,
    "realizationRecords" INTEGER NOT NULL DEFAULT 0,
    "notesRecords" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "conflictCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "errorSummary" TEXT,
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataImport_documentType_idx" ON "DataImport"("documentType");

-- CreateIndex
CREATE INDEX "DataImport_status_idx" ON "DataImport"("status");

-- CreateIndex
CREATE INDEX "DataImport_importedById_idx" ON "DataImport"("importedById");

-- CreateIndex
CREATE INDEX "DataImport_createdAt_idx" ON "DataImport"("createdAt");

-- AddForeignKey
ALTER TABLE "DataImport" ADD CONSTRAINT "DataImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
