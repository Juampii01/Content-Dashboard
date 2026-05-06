-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('PENDING', 'MEMBER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ClientRole" AS ENUM ('ACCESS');

-- DropIndex
DROP INDEX "AIMessage_userId_idx";

-- DropIndex
DROP INDEX "AccountSnapshot_userId_date_idx";

-- DropIndex
DROP INDEX "AccountSnapshot_userId_date_key";

-- DropIndex
DROP INDEX "Analysis_userId_idx";

-- DropIndex
DROP INDEX "BusinessBase_userId_idx";

-- DropIndex
DROP INDEX "BusinessBase_userId_key_key";

-- DropIndex
DROP INDEX "ChatMessage_userId_idx";

-- DropIndex
DROP INDEX "Competitor_userId_idx";

-- DropIndex
DROP INDEX "Competitor_userId_username_key";

-- DropIndex
DROP INDEX "ContentPiece_userId_idx";

-- DropIndex
DROP INDEX "ContentTemplate_userId_idx";

-- DropIndex
DROP INDEX "Conversation_userId_idx";

-- DropIndex
DROP INDEX "GuionItem_userId_idx";

-- DropIndex
DROP INDEX "GuionTab_userId_idx";

-- DropIndex
DROP INDEX "ICPProfile_userId_idx";

-- DropIndex
DROP INDEX "Idea_userId_idx";

-- DropIndex
DROP INDEX "IncomeRecord_userId_date_idx";

-- DropIndex
DROP INDEX "IncomeRecord_userId_source_idx";

-- DropIndex
DROP INDEX "Reel_userId_idx";

-- DropIndex
DROP INDEX "ScrapeJob_userId_idx";

-- DropIndex
DROP INDEX "SocialConnection_userId_idx";

-- DropIndex
DROP INDEX "SocialConnection_userId_platform_key";

-- DropIndex
DROP INDEX "Story_userId_publishedAt_idx";

-- DropIndex
DROP INDEX "Task_userId_idx";

-- DropIndex
DROP INDEX "Transcription_userId_idx";

-- DropIndex
DROP INDEX "UserReel_userId_publishedAt_idx";

-- DropIndex
DROP INDEX "UserReel_userId_viewsCount_idx";

-- AlterTable
ALTER TABLE "AIMessage" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "AccountSnapshot" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Analysis" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "BusinessBase" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Competitor" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ContentPiece" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ContentTemplate" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "GuionItem" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "GuionTab" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ICPProfile" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "IncomeRecord" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "OAuthState" ADD COLUMN     "clientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "globalRole" "GlobalRole" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Reel" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "ScrapeJob" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "SocialConnection" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "Transcription" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- AlterTable
ALTER TABLE "UserReel" DROP COLUMN "userId",
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "updatedBy" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "roleInClient" "ClientRole" NOT NULL DEFAULT 'ACCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "ClientAccess_userId_idx" ON "ClientAccess"("userId");

-- CreateIndex
CREATE INDEX "ClientAccess_clientId_idx" ON "ClientAccess"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccess_userId_clientId_key" ON "ClientAccess"("userId", "clientId");

-- CreateIndex
CREATE INDEX "AIMessage_clientId_idx" ON "AIMessage"("clientId");

-- CreateIndex
CREATE INDEX "AccountSnapshot_clientId_date_idx" ON "AccountSnapshot"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountSnapshot_clientId_date_key" ON "AccountSnapshot"("clientId", "date");

-- CreateIndex
CREATE INDEX "Analysis_clientId_idx" ON "Analysis"("clientId");

-- CreateIndex
CREATE INDEX "BusinessBase_clientId_idx" ON "BusinessBase"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessBase_clientId_key_key" ON "BusinessBase"("clientId", "key");

-- CreateIndex
CREATE INDEX "ChatMessage_clientId_idx" ON "ChatMessage"("clientId");

-- CreateIndex
CREATE INDEX "Competitor_clientId_idx" ON "Competitor"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_clientId_username_key" ON "Competitor"("clientId", "username");

-- CreateIndex
CREATE INDEX "ContentPiece_clientId_idx" ON "ContentPiece"("clientId");

-- CreateIndex
CREATE INDEX "ContentTemplate_clientId_idx" ON "ContentTemplate"("clientId");

-- CreateIndex
CREATE INDEX "Conversation_clientId_idx" ON "Conversation"("clientId");

-- CreateIndex
CREATE INDEX "GuionItem_clientId_idx" ON "GuionItem"("clientId");

-- CreateIndex
CREATE INDEX "GuionTab_clientId_idx" ON "GuionTab"("clientId");

-- CreateIndex
CREATE INDEX "ICPProfile_clientId_idx" ON "ICPProfile"("clientId");

-- CreateIndex
CREATE INDEX "Idea_clientId_idx" ON "Idea"("clientId");

-- CreateIndex
CREATE INDEX "IncomeRecord_clientId_date_idx" ON "IncomeRecord"("clientId", "date");

-- CreateIndex
CREATE INDEX "IncomeRecord_clientId_source_idx" ON "IncomeRecord"("clientId", "source");

-- CreateIndex
CREATE INDEX "OAuthState_clientId_idx" ON "OAuthState"("clientId");

-- CreateIndex
CREATE INDEX "Reel_clientId_idx" ON "Reel"("clientId");

-- CreateIndex
CREATE INDEX "ScrapeJob_clientId_idx" ON "ScrapeJob"("clientId");

-- CreateIndex
CREATE INDEX "SocialConnection_clientId_idx" ON "SocialConnection"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_clientId_platform_key" ON "SocialConnection"("clientId", "platform");

-- CreateIndex
CREATE INDEX "Story_clientId_publishedAt_idx" ON "Story"("clientId", "publishedAt");

-- CreateIndex
CREATE INDEX "Task_clientId_idx" ON "Task"("clientId");

-- CreateIndex
CREATE INDEX "Transcription_clientId_idx" ON "Transcription"("clientId");

-- CreateIndex
CREATE INDEX "UserReel_clientId_publishedAt_idx" ON "UserReel"("clientId", "publishedAt");

-- CreateIndex
CREATE INDEX "UserReel_clientId_viewsCount_idx" ON "UserReel"("clientId", "viewsCount");

-- AddForeignKey
ALTER TABLE "ClientAccess" ADD CONSTRAINT "ClientAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccess" ADD CONSTRAINT "ClientAccess_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

