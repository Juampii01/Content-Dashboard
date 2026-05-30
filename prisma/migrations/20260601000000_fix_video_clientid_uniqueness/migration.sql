-- TikTokVideo: The table exists with old schema (tiktokId + old column names).
-- Both tables are empty (0 rows) so we can safely recreate TikTokVideo with correct schema.
-- This migration:
--   1. Drops old TikTokVideo and recreates it matching schema.prisma exactly
--   2. Fixes YouTubeVideo: replaces global videoId unique with (clientId, videoId) composite

-- ─── TikTokVideo: recreate with correct column names (was: tiktokId, viewsCount, etc.) ───
DROP TABLE IF EXISTS "TikTokVideo";

CREATE TABLE "TikTokVideo" (
    "id"           TEXT NOT NULL,
    "clientId"     TEXT NOT NULL,
    "createdBy"    TEXT,
    "updatedBy"    TEXT,
    "videoId"      TEXT NOT NULL,
    "title"        TEXT NOT NULL DEFAULT '',
    "description"  TEXT NOT NULL DEFAULT '',
    "coverUrl"     TEXT,
    "shareUrl"     TEXT NOT NULL DEFAULT '',
    "durationSec"  INTEGER NOT NULL DEFAULT 0,
    "viewCount"    INTEGER NOT NULL DEFAULT 0,
    "likeCount"    INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount"   INTEGER NOT NULL DEFAULT 0,
    "publishedAt"  TIMESTAMP(3),
    "syncedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TikTokVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TikTokVideo_clientId_videoId_key"     ON "TikTokVideo"("clientId", "videoId");
CREATE INDEX        "TikTokVideo_clientId_publishedAt_idx" ON "TikTokVideo"("clientId", "publishedAt");
CREATE INDEX        "TikTokVideo_clientId_viewCount_idx"   ON "TikTokVideo"("clientId", "viewCount");

-- ─── YouTubeVideo: replace global unique with per-tenant composite unique ───
DROP INDEX IF EXISTS "YouTubeVideo_videoId_key";
CREATE UNIQUE INDEX "YouTubeVideo_clientId_videoId_key" ON "YouTubeVideo"("clientId", "videoId");
