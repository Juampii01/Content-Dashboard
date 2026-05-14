-- Migration: user_role_refactor
-- Replaces GlobalRole (PENDING/MEMBER/SUPER_ADMIN) + ClientAccess M:N
-- with UserRole (ADMIN/TEAM/SETTER/CLIENT) + direct Profile.clientId FK.

-- 1. Create new enum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEAM', 'SETTER', 'CLIENT');

-- 2. Add new columns to Profile (nullable first for data migration)
ALTER TABLE "Profile"
  ADD COLUMN "role"     "UserRole" NOT NULL DEFAULT 'CLIENT',
  ADD COLUMN "clientId" TEXT;

-- 3. Data migration: map old roles to new
UPDATE "Profile" SET "role" = 'ADMIN'  WHERE "globalRole" = 'SUPER_ADMIN';
UPDATE "Profile" SET "role" = 'CLIENT' WHERE "globalRole" IN ('MEMBER', 'PENDING');

-- 4. Data migration: assign clientId from first ClientAccess for non-admin users
UPDATE "Profile" p
SET "clientId" = (
  SELECT ca."clientId"
  FROM "ClientAccess" ca
  WHERE ca."userId" = p."id"
  ORDER BY ca."createdAt" ASC
  LIMIT 1
)
WHERE p."role" != 'ADMIN' AND p."clientId" IS NULL;

-- 5. Data migration: assign clientId for ADMIN users (first client by createdAt)
UPDATE "Profile" p
SET "clientId" = (
  SELECT c."id"
  FROM "Client" c
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE p."role" = 'ADMIN' AND p."clientId" IS NULL;

-- 6. Add FK constraint for clientId
ALTER TABLE "Profile"
  ADD CONSTRAINT "Profile_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Drop ClientAccess table and ClientRole enum
DROP TABLE IF EXISTS "ClientAccess";
DROP TYPE IF EXISTS "ClientRole";

-- 8. Drop old globalRole column and GlobalRole enum
ALTER TABLE "Profile" DROP COLUMN "globalRole";
DROP TYPE IF EXISTS "GlobalRole";

-- 9. Indexes
CREATE INDEX IF NOT EXISTS "Profile_clientId_idx" ON "Profile"("clientId");
