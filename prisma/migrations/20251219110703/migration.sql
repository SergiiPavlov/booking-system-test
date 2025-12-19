-- Migration: 20251219110703
-- Purpose: remove legacy BusinessAvailability table and align indexes.

-- The project migrated from JSONB-based weekly availability (BusinessAvailability)
-- to normalized tables (BusinessWorkingHour, BusinessBreak).

DROP TABLE IF EXISTS "BusinessAvailability";

-- Support lookups for availability by business + day.
-- (Safe to run multiple times.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'BusinessWorkingHour'
      AND indexname = 'BusinessWorkingHour_businessId_dayOfWeek_idx'
  ) THEN
    CREATE INDEX "BusinessWorkingHour_businessId_dayOfWeek_idx"
      ON "BusinessWorkingHour" ("businessId", "dayOfWeek");
  END IF;
END $$;
