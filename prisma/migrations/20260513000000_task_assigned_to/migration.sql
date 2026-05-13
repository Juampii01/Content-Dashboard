-- Add assignedTo column to Task (Profile.id of the team member who owns it).
-- Nullable so existing rows keep working without backfill.
ALTER TABLE "Task" ADD COLUMN "assignedTo" TEXT;

CREATE INDEX "Task_assignedTo_idx" ON "Task"("assignedTo");
