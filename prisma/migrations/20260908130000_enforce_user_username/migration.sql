-- Backfill legacy users before enforcing the required username constraint.
-- Employee IDs are unique, so this produces a deterministic unique login identifier.
UPDATE "User"
SET "username" = lower(
  regexp_replace(
    left('u_' || "employeeId", 30),
    '[^a-zA-Z0-9._-]',
    '-',
    'g'
  )
)
WHERE "username" IS NULL OR btrim("username") = '';

-- The previous migration already created the unique index. Enforce the domain rule now.
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
