-- CreateTable: AdAccount
CREATE TABLE "AdAccount" (
    "id"          TEXT NOT NULL,
    "clientId"    TEXT NOT NULL,
    "createdBy"   TEXT,
    "updatedBy"   TEXT,
    "platform"    TEXT NOT NULL,
    "accountId"   TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "currency"    TEXT NOT NULL DEFAULT 'USD',
    "syncedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdCampaign
CREATE TABLE "AdCampaign" (
    "id"           TEXT NOT NULL,
    "clientId"     TEXT NOT NULL,
    "adAccountId"  TEXT NOT NULL,
    "platform"     TEXT NOT NULL,
    "campaignId"   TEXT NOT NULL,
    "name"         TEXT NOT NULL DEFAULT '',
    "status"       TEXT NOT NULL DEFAULT 'UNKNOWN',
    "objective"    TEXT NOT NULL DEFAULT '',
    "spend"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions"  INTEGER NOT NULL DEFAULT 0,
    "clicks"       INTEGER NOT NULL DEFAULT 0,
    "reach"        INTEGER NOT NULL DEFAULT 0,
    "ctr"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpc"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions"  INTEGER NOT NULL DEFAULT 0,
    "datePreset"   TEXT NOT NULL DEFAULT 'last_30d',
    "syncedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_clientId_platform_accountId_key" ON "AdAccount"("clientId", "platform", "accountId");
CREATE INDEX "AdAccount_clientId_platform_idx" ON "AdAccount"("clientId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "AdCampaign_campaignId_key" ON "AdCampaign"("campaignId");
CREATE INDEX "AdCampaign_clientId_platform_idx" ON "AdCampaign"("clientId", "platform");
CREATE INDEX "AdCampaign_adAccountId_idx" ON "AdCampaign"("adAccountId");
CREATE INDEX "AdCampaign_clientId_spend_idx" ON "AdCampaign"("clientId", "spend");

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_adAccountId_fkey"
    FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
