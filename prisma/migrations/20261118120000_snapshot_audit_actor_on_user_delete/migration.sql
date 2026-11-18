-- Keep audit history attributable after a login account is physically removed.
ALTER TABLE "AuditLog"
  ADD COLUMN "userNameSnapshot" TEXT,
  ADD COLUMN "userUsernameSnapshot" TEXT,
  ADD COLUMN "userEmployeeIdSnapshot" TEXT,
  ADD COLUMN "userRoleSnapshot" TEXT;

-- Backfill snapshots for still-linked audit records before any future deletion.
UPDATE "AuditLog" AS log
SET
  "userNameSnapshot" = u."name",
  "userUsernameSnapshot" = u."username",
  "userEmployeeIdSnapshot" = u."employeeId",
  "userRoleSnapshot" = u."role"::text
FROM "User" AS u
WHERE log."userId" = u."id";

CREATE OR REPLACE FUNCTION preserve_user_audit_snapshot_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "AuditLog"
  SET
    "userNameSnapshot" = COALESCE("userNameSnapshot", OLD."name"),
    "userUsernameSnapshot" = COALESCE("userUsernameSnapshot", OLD."username"),
    "userEmployeeIdSnapshot" = COALESCE("userEmployeeIdSnapshot", OLD."employeeId"),
    "userRoleSnapshot" = COALESCE("userRoleSnapshot", OLD."role"::text)
  WHERE "userId" = OLD."id";
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER preserve_user_audit_snapshot_before_delete
BEFORE DELETE ON "User"
FOR EACH ROW
EXECUTE FUNCTION preserve_user_audit_snapshot_before_delete();
