-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "PublishedPost" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "containerId" TEXT NOT NULL DEFAULT '',
    "postId" TEXT NOT NULL DEFAULT '',
    "mediaType" TEXT NOT NULL DEFAULT 'IMAGE',
    "mediaUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishedPost_clientId_createdAt_idx" ON "PublishedPost"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PublishedPost_clientId_status_idx" ON "PublishedPost"("clientId", "status");
