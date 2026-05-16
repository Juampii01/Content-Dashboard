-- CreateTable
CREATE TABLE "TikTokVideo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "coverUrl" TEXT,
    "shareUrl" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TikTokVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TikTokVideo_videoId_key" ON "TikTokVideo"("videoId");

-- CreateIndex
CREATE INDEX "TikTokVideo_clientId_publishedAt_idx" ON "TikTokVideo"("clientId", "publishedAt");

-- CreateIndex
CREATE INDEX "TikTokVideo_clientId_viewCount_idx" ON "TikTokVideo"("clientId", "viewCount");
