-- Rename AccountSnapshot.impressions → totalViews (idempotent)
-- Uses a DO block so re-running after manual application is a no-op.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AccountSnapshot' AND column_name = 'impressions'
  ) THEN
    ALTER TABLE "AccountSnapshot" RENAME COLUMN "impressions" TO "totalViews";
  END IF;
END $$;
