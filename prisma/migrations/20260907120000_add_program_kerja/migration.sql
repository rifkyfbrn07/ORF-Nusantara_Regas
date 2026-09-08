-- CreateEnum
CREATE TYPE "ProgramCategory" AS ENUM ('PENGADAAN', 'RAPAT_KOORDINASI', 'OPERASIONAL_RUTIN', 'AUDIT');

-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('PLAN', 'REALISASI', 'ON_PROGRESS', 'BELUM_TEREALISASI');

-- CreateTable
CREATE TABLE "ProgramKerja" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "ProgramCategory" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT,
    "realization" TEXT,
    "planTarget" INTEGER NOT NULL DEFAULT 100,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "ProgramStatus" NOT NULL DEFAULT 'PLAN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramKerja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramKerjaMonth" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 100,
    "realization" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramKerjaMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramKerja_year_idx" ON "ProgramKerja"("year");

-- CreateIndex
CREATE INDEX "ProgramKerja_category_idx" ON "ProgramKerja"("category");

-- CreateIndex
CREATE INDEX "ProgramKerja_status_idx" ON "ProgramKerja"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramKerja_year_category_name_key" ON "ProgramKerja"("year", "category", "name");

-- CreateIndex
CREATE INDEX "ProgramKerjaMonth_programId_month_idx" ON "ProgramKerjaMonth"("programId", "month");

-- CreateIndex
CREATE INDEX "ProgramKerjaMonth_month_idx" ON "ProgramKerjaMonth"("month");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramKerjaMonth_programId_month_week_key" ON "ProgramKerjaMonth"("programId", "month", "week");

-- AddForeignKey
ALTER TABLE "ProgramKerjaMonth" ADD CONSTRAINT "ProgramKerjaMonth_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
