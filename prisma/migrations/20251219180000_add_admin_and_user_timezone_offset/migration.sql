-- Add ADMIN role and store user timezone offset

-- 1) Extend enum UserRole with ADMIN (safe if re-run)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
      AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
  END IF;
END $$;

-- 2) Add timezoneOffsetMin to User (minutes as returned by JS Date.getTimezoneOffset())
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezoneOffsetMin" INTEGER NOT NULL DEFAULT 0;

-- 2) Add timezone offset to users (minutes, as returned by JS Date.getTimezoneOffset())
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "timezoneOffsetMin" INTEGER NOT NULL DEFAULT 0;
