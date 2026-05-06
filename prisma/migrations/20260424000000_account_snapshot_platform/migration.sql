-- MC-02: AccountSnapshot platform discriminator
-- Adds a `platform` column to distinguish between Instagram, YouTube, TikTok
-- snapshots that share (clientId, date). Without this, YT sync and IG sync
-- silently overwrote each other in the same row.
--
-- Safe to apply on live prod because prod has 0 rows at migration time
-- (verified via scripts/check-db.ts). Default 'instagram' is inocuo on empty
-- table and matches the historical intent (this table was originally added
-- for IG-only metrics).
--
-- Rollback SQL documented in Plan Definitivo v2.1 §10.

-- AlterTable
ALTER TABLE "AccountSnapshot" ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'instagram';

-- DropIndex
DROP INDEX IF EXISTS "AccountSnapshot_clientId_date_key";
DROP INDEX IF EXISTS "AccountSnapshot_clientId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX "AccountSnapshot_clientId_platform_date_key" ON "AccountSnapshot"("clientId", "platform", "date");
CREATE INDEX "AccountSnapshot_clientId_platform_date_idx" ON "AccountSnapshot"("clientId", "platform", "date");
