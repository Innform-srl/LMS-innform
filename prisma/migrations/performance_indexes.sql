-- Performance Indexes Migration
-- Run this in Supabase SQL Editor to add performance indexes

-- User indexes
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_isApproved_idx" ON "User"("isApproved");
CREATE INDEX IF NOT EXISTS "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_isApproved_createdAt_idx" ON "User"("isApproved", "createdAt");

-- Course indexes
CREATE INDEX IF NOT EXISTS "Course_published_idx" ON "Course"("published");
CREATE INDEX IF NOT EXISTS "Course_published_createdAt_idx" ON "Course"("published", "createdAt");
CREATE INDEX IF NOT EXISTS "Course_archived_idx" ON "Course"("archived");

-- Module indexes
CREATE INDEX IF NOT EXISTS "Module_courseId_idx" ON "Module"("courseId");
CREATE INDEX IF NOT EXISTS "Module_published_idx" ON "Module"("published");
CREATE INDEX IF NOT EXISTS "Module_courseId_published_idx" ON "Module"("courseId", "published");
CREATE INDEX IF NOT EXISTS "Module_position_idx" ON "Module"("position");

-- Enrollment indexes
CREATE INDEX IF NOT EXISTS "Enrollment_userId_idx" ON "Enrollment"("userId");
CREATE INDEX IF NOT EXISTS "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX IF NOT EXISTS "Enrollment_completed_idx" ON "Enrollment"("completed");
CREATE INDEX IF NOT EXISTS "Enrollment_userId_completed_idx" ON "Enrollment"("userId", "completed");
CREATE INDEX IF NOT EXISTS "Enrollment_createdAt_idx" ON "Enrollment"("createdAt");

-- Analyze tables to update statistics
ANALYZE "User";
ANALYZE "Course";
ANALYZE "Module";
ANALYZE "Enrollment";
ANALYZE "ModuleProgress";
