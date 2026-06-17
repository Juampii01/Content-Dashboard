-- GuionTab.updatedAt was missing in production (DDL drift). Without it, Prisma's
-- findMany selecting updatedAt throws → /api/guiones/tabs returns 500.
-- Additive + idempotent; default backfills existing rows.
ALTER TABLE "GuionTab" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
