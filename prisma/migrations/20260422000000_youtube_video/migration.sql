-- CreateTable
CREATE TABLE "YouTubeVideo" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "videoId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT,
    "url" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "durationLabel" TEXT NOT NULL DEFAULT '',
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "watchTimeMinutes" INTEGER,
    "averageViewDuration" INTEGER,
    "averageViewPercent" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeVideo_videoId_key" ON "YouTubeVideo"("videoId");

-- CreateIndex
CREATE INDEX "YouTubeVideo_clientId_publishedAt_idx" ON "YouTubeVideo"("clientId", "publishedAt");

-- CreateIndex
CREATE INDEX "YouTubeVideo_clientId_viewsCount_idx" ON "YouTubeVideo"("clientId", "viewsCount");

-- CreateIndex
CREATE INDEX "YouTubeVideo_channelId_idx" ON "YouTubeVideo"("channelId");
