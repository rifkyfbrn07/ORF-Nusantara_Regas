-- AlterTable: ShiftExchange add targetScheduleId (OFF day of target operator)
ALTER TABLE "ShiftExchange" ADD COLUMN IF NOT EXISTS "targetScheduleId" TEXT;

-- AddForeignKey (idempotent guard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShiftExchange_targetScheduleId_fkey') THEN
    ALTER TABLE "ShiftExchange" ADD CONSTRAINT "ShiftExchange_targetScheduleId_fkey" FOREIGN KEY ("targetScheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShiftExchange_targetScheduleId_idx" ON "ShiftExchange"("targetScheduleId");