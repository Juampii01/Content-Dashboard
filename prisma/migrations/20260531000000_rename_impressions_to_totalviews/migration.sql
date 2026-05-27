-- Rename AccountSnapshot.impressions → totalViews
-- Safe rename: no data loss, atomic in Postgres.
-- The field stored sum of video views across all synced media, not ad impressions.
ALTER TABLE "AccountSnapshot" RENAME COLUMN "impressions" TO "totalViews";
