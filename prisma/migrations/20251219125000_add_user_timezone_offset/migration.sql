-- Add timezone offset to users (minutes, as returned by JS Date.getTimezoneOffset())
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezoneOffsetMin" INTEGER NOT NULL DEFAULT 0;
