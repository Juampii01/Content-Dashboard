-- AddForeignKey
ALTER TABLE "IGMessage" ADD CONSTRAINT "IGMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "IGConversation"("conversationId")
  ON DELETE CASCADE ON UPDATE CASCADE;
