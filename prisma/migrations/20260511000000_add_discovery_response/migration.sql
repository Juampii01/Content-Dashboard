-- CreateTable
CREATE TABLE "DiscoveryResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT,
    "email" TEXT,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryResponse_userId_createdAt_idx" ON "DiscoveryResponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryResponse_clientId_createdAt_idx" ON "DiscoveryResponse"("clientId", "createdAt");
