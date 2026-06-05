-- IGMessage.conversationId → IGConversation.conversationId (CASCADE).
-- Self-sufficient + idempotent: ensures the referenced column is UNIQUE first
-- (some environments created IGConversation before the @unique was added), then
-- adds the FK only if it doesn't already exist.

-- 1) Required unique constraint on the referenced column
CREATE UNIQUE INDEX IF NOT EXISTS "IGConversation_conversationId_key"
  ON "IGConversation"("conversationId");

-- 2) Drop any orphan messages that would violate the FK (none expected)
DELETE FROM "IGMessage" m
  WHERE NOT EXISTS (SELECT 1 FROM "IGConversation" c WHERE c."conversationId" = m."conversationId");

-- 3) Add the FK only if it isn't already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IGMessage_conversationId_fkey'
  ) THEN
    ALTER TABLE "IGMessage"
      ADD CONSTRAINT "IGMessage_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "IGConversation"("conversationId")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
