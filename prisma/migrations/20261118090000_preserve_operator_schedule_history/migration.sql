-- Preserve the operator identity on historical schedules when a login User is deleted.
ALTER TABLE "Schedule"
  ADD COLUMN "operatorNameSnapshot" TEXT,
  ADD COLUMN "operatorEmployeeIdSnapshot" TEXT,
  ADD COLUMN "operatorTeamSnapshot" TEXT,
  ADD COLUMN "operatorPositionSnapshot" TEXT;

ALTER TABLE "Schedule" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_userId_fkey";
ALTER TABLE "Schedule"
  ADD CONSTRAINT "Schedule_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backstop for direct Prisma/SQL account deletes outside the User Management action.
CREATE OR REPLACE FUNCTION preserve_operator_schedule_snapshot_before_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Schedule"
  SET
    "operatorNameSnapshot" = COALESCE("operatorNameSnapshot", OLD."name"),
    "operatorEmployeeIdSnapshot" = COALESCE("operatorEmployeeIdSnapshot", OLD."employeeId"),
    "operatorTeamSnapshot" = COALESCE("operatorTeamSnapshot", OLD."team"),
    "operatorPositionSnapshot" = COALESCE("operatorPositionSnapshot", OLD."position")
  WHERE "userId" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER preserve_operator_schedule_snapshot_before_user_delete
BEFORE DELETE ON "User"
FOR EACH ROW
EXECUTE FUNCTION preserve_operator_schedule_snapshot_before_user_delete();
