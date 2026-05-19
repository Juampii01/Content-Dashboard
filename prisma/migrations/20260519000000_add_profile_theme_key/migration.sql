-- Add themeKey to Profile so each user has their own brand theme preference.
-- Defaults to 'eternity' for all existing rows.
ALTER TABLE "Profile" ADD COLUMN "themeKey" TEXT NOT NULL DEFAULT 'eternity';
