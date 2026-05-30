-- DropIndex: remove global uniqueness on videoId (videos from different tenants can share same ID)
DROP INDEX IF EXISTS "TikTokVideo_videoId_key";
DROP INDEX IF EXISTS "YouTubeVideo_videoId_key";

-- CreateIndex: uniqueness is now scoped per (client, video) pair
CREATE UNIQUE INDEX IF NOT EXISTS "TikTokVideo_clientId_videoId_key" ON "TikTokVideo"("clientId", "videoId");
CREATE UNIQUE INDEX IF NOT EXISTS "YouTubeVideo_clientId_videoId_key" ON "YouTubeVideo"("clientId", "videoId");
