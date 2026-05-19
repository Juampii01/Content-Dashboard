-- Add updatedAt to GuionTab (safe: NOT NULL with DEFAULT fills existing rows)
ALTER TABLE "GuionTab" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "GuionItem_tabId_idx" ON "GuionItem"("tabId");
CREATE INDEX IF NOT EXISTS "Task_clientId_columnId_idx" ON "Task"("clientId", "columnId");
CREATE INDEX IF NOT EXISTS "IncomeRecord_reelId_idx" ON "IncomeRecord"("reelId");
CREATE INDEX IF NOT EXISTS "ScrapeJob_competitorId_idx" ON "ScrapeJob"("competitorId");

-- Fix ScrapeJob → Competitor FK: ensure CASCADE delete (jobs are derivative of competitors)
ALTER TABLE "ScrapeJob" DROP CONSTRAINT IF EXISTS "ScrapeJob_competitorId_fkey";
ALTER TABLE "ScrapeJob" ADD CONSTRAINT "ScrapeJob_competitorId_fkey"
  FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
