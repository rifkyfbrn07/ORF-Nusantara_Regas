-- CreateTable
CREATE TABLE "ProgramKerjaScheduleHistory" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "previousYear" INTEGER NOT NULL,
    "previousMonth" INTEGER,
    "newYear" INTEGER NOT NULL,
    "newMonth" INTEGER,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "ProgramKerjaScheduleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramKerjaRealizationLog" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "oldRealization" INTEGER,
    "newRealization" INTEGER NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ProgramKerjaRealizationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramKerjaScheduleHistory_programId_idx" ON "ProgramKerjaScheduleHistory"("programId");

-- CreateIndex
CREATE INDEX "ProgramKerjaScheduleHistory_changedById_idx" ON "ProgramKerjaScheduleHistory"("changedById");

-- CreateIndex
CREATE INDEX "ProgramKerjaScheduleHistory_changedAt_idx" ON "ProgramKerjaScheduleHistory"("changedAt");

-- CreateIndex
CREATE INDEX "ProgramKerjaRealizationLog_programId_idx" ON "ProgramKerjaRealizationLog"("programId");

-- CreateIndex
CREATE INDEX "ProgramKerjaRealizationLog_programId_year_month_idx" ON "ProgramKerjaRealizationLog"("programId", "year", "month");

-- CreateIndex
CREATE INDEX "ProgramKerjaRealizationLog_changedById_idx" ON "ProgramKerjaRealizationLog"("changedById");

-- CreateIndex
CREATE INDEX "ProgramKerjaRealizationLog_changedAt_idx" ON "ProgramKerjaRealizationLog"("changedAt");

-- AddForeignKey
ALTER TABLE "ProgramKerjaScheduleHistory" ADD CONSTRAINT "ProgramKerjaScheduleHistory_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKerjaScheduleHistory" ADD CONSTRAINT "ProgramKerjaScheduleHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKerjaRealizationLog" ADD CONSTRAINT "ProgramKerjaRealizationLog_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramKerja"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramKerjaRealizationLog" ADD CONSTRAINT "ProgramKerjaRealizationLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
