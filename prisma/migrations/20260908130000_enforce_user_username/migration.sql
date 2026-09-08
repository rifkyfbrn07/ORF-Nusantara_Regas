-- Backfill legacy users before enforcing the required username constraint.
-- The user id is unique, so the generated username cannot collide between legacy rows.
UPDATE "User"
SET "username" = 'u_' || substr(md5("id"), 1, 12)
WHERE "username" IS NULL OR btrim("username") = '';

-- The previous migration already created the unique index. Enforce the domain rule now.
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
