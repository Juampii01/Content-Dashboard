-- CreateTable
CREATE TABLE "ContentReference" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "url" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'IG',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReference_clientId_idx" ON "ContentReference"("clientId");
