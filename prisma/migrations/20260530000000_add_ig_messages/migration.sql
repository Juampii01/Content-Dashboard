-- CreateTable: IGConversation
CREATE TABLE IF NOT EXISTS "IGConversation" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL DEFAULT '',
    "participantUsername" TEXT NOT NULL DEFAULT '',
    "participantPic" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3),
    "lastUserMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IGConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IGMessage
CREATE TABLE IF NOT EXISTS "IGMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL DEFAULT '',
    "fromUsername" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "isFromBusiness" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IGMessage_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "IGConversation_clientId_conversationId_key" ON "IGConversation"("clientId", "conversationId");
CREATE UNIQUE INDEX IF NOT EXISTS "IGMessage_clientId_messageId_key" ON "IGMessage"("clientId", "messageId");

-- Regular indexes
CREATE INDEX IF NOT EXISTS "IGConversation_clientId_lastMessageAt_idx" ON "IGConversation"("clientId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "IGMessage_clientId_conversationId_timestamp_idx" ON "IGMessage"("clientId", "conversationId", "timestamp");
