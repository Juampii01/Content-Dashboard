-- AlterTable: add token / cost columns to ChatMessage (parity with AIMessage)
ALTER TABLE "ChatMessage" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN "outputTokens" INTEGER;
ALTER TABLE "ChatMessage" ADD COLUMN "costUsd" DOUBLE PRECISION;
