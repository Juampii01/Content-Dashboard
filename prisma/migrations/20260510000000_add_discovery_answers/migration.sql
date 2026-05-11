-- CreateTable
CREATE TABLE "DiscoveryAnswers" (
    "id" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryAnswers_pkey" PRIMARY KEY ("id")
);
