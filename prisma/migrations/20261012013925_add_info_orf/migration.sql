-- CreateEnum
CREATE TYPE "InfoOrfSection" AS ENUM ('UPSTREAM', 'TOTAL', 'FSRU');

-- CreateEnum
CREATE TYPE "NextCargoStatus" AS ENUM ('SCHEDULED', 'DISCHARGING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "InfoOrfReport" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "reportHour" TEXT NOT NULL,
    "reportTime" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "nextCargoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoOrfReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoOrfMetric" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "section" "InfoOrfSection" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoOrfMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfoOrfLine" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "lineCode" TEXT NOT NULL,
    "lineName" TEXT NOT NULL,
    "flowRate" DECIMAL(18,4),
    "volume" DECIMAL(18,4),
    "energy" DECIMAL(18,4),
    "flowUnit" TEXT NOT NULL DEFAULT 'MMSCFD',
    "volumeUnit" TEXT NOT NULL DEFAULT 'm³',
    "energyUnit" TEXT NOT NULL DEFAULT 'MMBTU',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoOrfLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextCargo" (
    "id" TEXT NOT NULL,
    "eta" TIMESTAMP(3) NOT NULL,
    "cargoCode" TEXT NOT NULL,
    "vesselName" TEXT,
    "volumeLng" DECIMAL(18,2),
    "note" TEXT,
    "status" "NextCargoStatus" NOT NULL DEFAULT 'SCHEDULED',
    "lastUpdatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextCargo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InfoOrfReport_reportDate_idx" ON "InfoOrfReport"("reportDate");

-- CreateIndex
CREATE INDEX "InfoOrfReport_reportTime_idx" ON "InfoOrfReport"("reportTime");

-- CreateIndex
CREATE UNIQUE INDEX "InfoOrfReport_reportDate_reportHour_key" ON "InfoOrfReport"("reportDate", "reportHour");

-- CreateIndex
CREATE INDEX "InfoOrfMetric_reportId_idx" ON "InfoOrfMetric"("reportId");

-- CreateIndex
CREATE INDEX "InfoOrfLine_reportId_idx" ON "InfoOrfLine"("reportId");

-- CreateIndex
CREATE INDEX "NextCargo_status_idx" ON "NextCargo"("status");

-- CreateIndex
CREATE INDEX "NextCargo_eta_idx" ON "NextCargo"("eta");

-- AddForeignKey
ALTER TABLE "InfoOrfReport" ADD CONSTRAINT "InfoOrfReport_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoOrfReport" ADD CONSTRAINT "InfoOrfReport_nextCargoId_fkey" FOREIGN KEY ("nextCargoId") REFERENCES "NextCargo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoOrfMetric" ADD CONSTRAINT "InfoOrfMetric_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "InfoOrfReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoOrfLine" ADD CONSTRAINT "InfoOrfLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "InfoOrfReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextCargo" ADD CONSTRAINT "NextCargo_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
