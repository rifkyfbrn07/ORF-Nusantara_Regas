ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LEAD_OPERATOR';

ALTER TABLE "User"
ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TeamConfig"
ADD COLUMN "leadOperatorId" TEXT;

ALTER TABLE "LeaveRequest"
ADD COLUMN "teamSnapshot" TEXT,
ADD COLUMN "requesterRoleSnapshot" TEXT,
ADD COLUMN "leadOperatorId" TEXT,
ADD COLUMN "leadOperatorName" TEXT,
ADD COLUMN "leadOperatorRole" TEXT,
ADD COLUMN "leadOperatorApprovedAt" TIMESTAMP(3),
ADD COLUMN "leadOperatorNote" TEXT,
ADD COLUMN "reviewerRole" TEXT,
ADD COLUMN "teamLeadRole" TEXT,
ADD COLUMN "managerRole" TEXT;

CREATE TABLE "GlobalApprovalConfig" (
  "id" TEXT NOT NULL,
  "teamLeadId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GlobalApprovalConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaveQuota" (
  "id" TEXT NOT NULL,
  "team" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "maxOperators" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeaveQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LeaveQuota_team_date_key" ON "LeaveQuota"("team", "date");
CREATE INDEX "LeaveQuota_date_team_idx" ON "LeaveQuota"("date", "team");

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);
