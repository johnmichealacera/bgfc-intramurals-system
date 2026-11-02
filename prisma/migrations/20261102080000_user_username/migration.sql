ALTER TABLE "users" ADD COLUMN "username" TEXT;

UPDATE "users"
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "email" IS NOT NULL AND TRIM("email") <> '';

UPDATE "users"
SET "username" = 'user_' || LEFT("id", 8)
WHERE "username" IS NULL OR TRIM("username") = '';

WITH ranked AS (
  SELECT id, "username", ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt") AS rn
  FROM "users"
)
UPDATE "users" u
SET "username" = ranked."username" || ranked.rn
FROM ranked
WHERE u.id = ranked.id AND ranked.rn > 1;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
