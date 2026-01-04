-- Migration: Add Blended Learning / Attendance Tracking
-- Run this on Supabase SQL Editor

-- Create enums
CREATE TYPE "SessionType" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');
CREATE TYPE "AttendanceStatus" AS ENUM ('REGISTERED', 'PRESENT', 'ATTENDED', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- Add new columns to LiveSession
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "sessionType" "SessionType" NOT NULL DEFAULT 'ONLINE';
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "googleMeetCode" TEXT;
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "maxParticipants" INTEGER;
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT;
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "reminderSent24h" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "reminderSent1h" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LiveSession" ADD COLUMN IF NOT EXISTS "physicalRoomId" TEXT;

-- Create PhysicalRoom table
CREATE TABLE IF NOT EXISTS "PhysicalRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "equipment" TEXT[],
    "contactInfo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhysicalRoom_pkey" PRIMARY KEY ("id")
);

-- Create SessionAttendance table
CREATE TABLE IF NOT EXISTS "SessionAttendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'REGISTERED',
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SessionAttendance_pkey" PRIMARY KEY ("id")
);

-- Create RoomBooking table
CREATE TABLE IF NOT EXISTS "RoomBooking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "bookedById" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for SessionAttendance
ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_userId_key" UNIQUE ("sessionId", "userId");

-- Create indexes
CREATE INDEX IF NOT EXISTS "LiveSession_sessionType_idx" ON "LiveSession"("sessionType");
CREATE INDEX IF NOT EXISTS "PhysicalRoom_isActive_idx" ON "PhysicalRoom"("isActive");
CREATE INDEX IF NOT EXISTS "SessionAttendance_sessionId_idx" ON "SessionAttendance"("sessionId");
CREATE INDEX IF NOT EXISTS "SessionAttendance_userId_idx" ON "SessionAttendance"("userId");
CREATE INDEX IF NOT EXISTS "SessionAttendance_status_idx" ON "SessionAttendance"("status");
CREATE INDEX IF NOT EXISTS "RoomBooking_roomId_idx" ON "RoomBooking"("roomId");
CREATE INDEX IF NOT EXISTS "RoomBooking_startTime_endTime_idx" ON "RoomBooking"("startTime", "endTime");
CREATE INDEX IF NOT EXISTS "RoomBooking_status_idx" ON "RoomBooking"("status");

-- Add foreign keys
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_physicalRoomId_fkey"
    FOREIGN KEY ("physicalRoomId") REFERENCES "PhysicalRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionAttendance" ADD CONSTRAINT "SessionAttendance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "PhysicalRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
