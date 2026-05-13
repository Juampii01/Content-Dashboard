-- TikTokVideo: client's own TikTok videos. Synced from the Apify TikTok
-- scraper. Separate from UserReel because the metrics surface differs
-- (no reach/impressions on public, but plays/likes/shares are public).

CREATE TABLE "TikTokVideo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "tiktokId" TEXT NOT NULL,
    "shortcode" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "caption" TEXT,
    "durationSec" DOUBLE PRECISION,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TikTokVideo_tiktokId_key" ON "TikTokVideo"("tiktokId");
CREATE INDEX "TikTokVideo_clientId_publishedAt_idx" ON "TikTokVideo"("clientId", "publishedAt");
