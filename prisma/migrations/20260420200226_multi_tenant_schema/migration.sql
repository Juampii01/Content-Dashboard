-- DropIndex
DROP INDEX "BusinessBase_key_key";

-- DropIndex
DROP INDEX "Competitor_username_key";

-- DropIndex
DROP INDEX "SocialConnection_platform_key";

-- AlterTable
ALTER TABLE "AIMessage" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "BusinessBase" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ContentPiece" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ContentTemplate" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "GuionItem" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "GuionTab" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ICPProfile" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "OAuthState" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Reel" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ScrapeJob" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "SocialConnection" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Transcription" ADD COLUMN     "userId" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "instagramUsername" TEXT,
    "nicho" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramId" TEXT NOT NULL,
    "shortcode" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT,
    "caption" TEXT,
    "durationSec" DOUBLE PRECISION,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "viewsOrganic" INTEGER NOT NULL DEFAULT 0,
    "viewsPaid" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "reachCount" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "organicPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAd" BOOLEAN NOT NULL DEFAULT false,
    "isTrialReel" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instagramId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "replies" INTEGER NOT NULL DEFAULT 0,
    "stickerTaps" INTEGER NOT NULL DEFAULT 0,
    "exits" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "posts" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "profileVisits" INTEGER NOT NULL DEFAULT 0,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "reelId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserReel_instagramId_key" ON "UserReel"("instagramId");

-- CreateIndex
CREATE INDEX "UserReel_userId_publishedAt_idx" ON "UserReel"("userId", "publishedAt");

-- CreateIndex
CREATE INDEX "UserReel_userId_viewsCount_idx" ON "UserReel"("userId", "viewsCount");

-- CreateIndex
CREATE UNIQUE INDEX "Story_instagramId_key" ON "Story"("instagramId");

-- CreateIndex
CREATE INDEX "Story_userId_publishedAt_idx" ON "Story"("userId", "publishedAt");

-- CreateIndex
CREATE INDEX "AccountSnapshot_userId_date_idx" ON "AccountSnapshot"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSnapshot_userId_date_key" ON "AccountSnapshot"("userId", "date");

-- CreateIndex
CREATE INDEX "IncomeRecord_userId_date_idx" ON "IncomeRecord"("userId", "date");

-- CreateIndex
CREATE INDEX "IncomeRecord_userId_source_idx" ON "IncomeRecord"("userId", "source");

-- CreateIndex
CREATE INDEX "AIMessage_userId_idx" ON "AIMessage"("userId");

-- CreateIndex
CREATE INDEX "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE INDEX "BusinessBase_userId_idx" ON "BusinessBase"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessBase_userId_key_key" ON "BusinessBase"("userId", "key");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreateIndex
CREATE INDEX "Competitor_userId_idx" ON "Competitor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_userId_username_key" ON "Competitor"("userId", "username");

-- CreateIndex
CREATE INDEX "ContentPiece_userId_idx" ON "ContentPiece"("userId");

-- CreateIndex
CREATE INDEX "ContentTemplate_userId_idx" ON "ContentTemplate"("userId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "GuionItem_userId_idx" ON "GuionItem"("userId");

-- CreateIndex
CREATE INDEX "GuionTab_userId_idx" ON "GuionTab"("userId");

-- CreateIndex
CREATE INDEX "ICPProfile_userId_idx" ON "ICPProfile"("userId");

-- CreateIndex
CREATE INDEX "Idea_userId_idx" ON "Idea"("userId");

-- CreateIndex
CREATE INDEX "OAuthState_userId_idx" ON "OAuthState"("userId");

-- CreateIndex
CREATE INDEX "Reel_userId_idx" ON "Reel"("userId");

-- CreateIndex
CREATE INDEX "ScrapeJob_userId_idx" ON "ScrapeJob"("userId");

-- CreateIndex
CREATE INDEX "SocialConnection_userId_idx" ON "SocialConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_userId_platform_key" ON "SocialConnection"("userId", "platform");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "Transcription_userId_idx" ON "Transcription"("userId");


-- Drop temporary DEFAULT '' on userId columns (kept only so ADD COLUMN works on tables with existing rows)
ALTER TABLE "AIMessage" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Analysis" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "BusinessBase" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ChatMessage" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Competitor" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ContentPiece" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ContentTemplate" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "GuionItem" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "GuionTab" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ICPProfile" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Idea" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "OAuthState" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Reel" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "ScrapeJob" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "SocialConnection" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Transcription" ALTER COLUMN "userId" DROP DEFAULT;
