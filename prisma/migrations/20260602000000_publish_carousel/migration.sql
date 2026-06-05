-- Carousel support for Instagram publishing.
-- Additive, low-risk: two text[] columns defaulting to empty array.
ALTER TABLE "PublishedPost" ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "PublishedPost" ADD COLUMN IF NOT EXISTS "itemTypes" TEXT[] NOT NULL DEFAULT '{}';

-- Backfill existing single-media rows so mediaUrls is never empty for old posts.
UPDATE "PublishedPost" SET "mediaUrls" = ARRAY["mediaUrl"] WHERE array_length("mediaUrls", 1) IS NULL AND "mediaUrl" <> '';
