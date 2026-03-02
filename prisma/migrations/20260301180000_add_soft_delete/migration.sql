-- Add soft delete support to User and Enrollment models
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Enrollment" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes for efficient soft delete filtering
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Enrollment_deletedAt_idx" ON "Enrollment"("deletedAt");
