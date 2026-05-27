-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "AudienceSnapshot" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "date" TIMESTAMP(3) NOT NULL,
    "genderAge" JSONB NOT NULL DEFAULT '{}',
    "country" JSONB NOT NULL DEFAULT '{}',
    "city" JSONB NOT NULL DEFAULT '{}',
    "followerHistory" JSONB NOT NULL DEFAULT '[]',
    "reachHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "AudienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "AudienceSnapshot_clientId_platform_date_key" ON "AudienceSnapshot"("clientId", "platform", "date");

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "AudienceSnapshot_clientId_platform_date_idx" ON "AudienceSnapshot"("clientId", "platform", "date");
