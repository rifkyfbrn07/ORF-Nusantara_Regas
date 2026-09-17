-- AlterTable
ALTER TABLE "ProgramKerja" ADD COLUMN     "evidenceUploadedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceUploadedById" TEXT;

-- CreateIndex
CREATE INDEX "ProgramKerja_evidenceUploadedById_idx" ON "ProgramKerja"("evidenceUploadedById");

-- AddForeignKey
ALTER TABLE "ProgramKerja" ADD CONSTRAINT "ProgramKerja_evidenceUploadedById_fkey" FOREIGN KEY ("evidenceUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
