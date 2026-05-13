-- Add Graph API media_type so we can distinguish reels from carousels / images
-- without changing the existing UserReel surface. Nullable: legacy rows
-- (synced before this column existed) are treated as VIDEO by the UI.
ALTER TABLE "UserReel" ADD COLUMN "mediaType" TEXT;

CREATE INDEX "UserReel_clientId_mediaType_idx" ON "UserReel"("clientId", "mediaType");
