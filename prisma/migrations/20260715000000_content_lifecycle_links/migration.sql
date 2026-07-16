-- Tier 1: content lifecycle relations + media on ContentPiece (additive, idempotent).
ALTER TABLE "ContentPiece" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
ALTER TABLE "ContentPiece" ADD COLUMN IF NOT EXISTS "coverUrl" TEXT;
ALTER TABLE "ContentPiece" ADD COLUMN IF NOT EXISTS "ideaId" TEXT;
ALTER TABLE "ContentPiece" ADD COLUMN IF NOT EXISTS "guionItemId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ContentPiece_guionItemId_key" ON "ContentPiece"("guionItemId");
CREATE INDEX IF NOT EXISTS "ContentPiece_ideaId_idx" ON "ContentPiece"("ideaId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ContentPiece_ideaId_fkey') THEN
    ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_ideaId_fkey"
      FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ContentPiece_guionItemId_fkey') THEN
    ALTER TABLE "ContentPiece" ADD CONSTRAINT "ContentPiece_guionItemId_fkey"
      FOREIGN KEY ("guionItemId") REFERENCES "GuionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
