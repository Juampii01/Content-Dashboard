-- CreateTable
CREATE TABLE "InstagramComment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramComment_clientId_commentId_key" ON "InstagramComment"("clientId", "commentId");

-- CreateIndex
CREATE INDEX "InstagramComment_clientId_mediaId_idx" ON "InstagramComment"("clientId", "mediaId");

-- CreateIndex
CREATE INDEX "InstagramComment_clientId_parentId_idx" ON "InstagramComment"("clientId", "parentId");
