-- AlterTable
ALTER TABLE "ProgramKerja" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "picId" TEXT,
ADD COLUMN     "picProgress" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ProgramKerjaTask" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "doneById" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramKerjaTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramKerjaTask_programId_idx" ON "ProgramKerjaTask"("programId");

-- CreateIndex
CREATE INDEX "ProgramKerja_picId_idx" ON "ProgramKerja"("picId");

-- AddForeignKey
ALTER TABLE "ProgramKerja" ADD CONSTRAINT "ProgramKerja_picId_fkey" FOREIGN KEY ("picId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKerjaTask" ADD CONSTRAINT "ProgramKerjaTask_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
