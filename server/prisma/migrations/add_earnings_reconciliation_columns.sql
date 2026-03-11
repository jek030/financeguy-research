ALTER TABLE "public"."earnings_calendar"
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "superseded_by_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "superseded_reason" VARCHAR(64);

CREATE INDEX IF NOT EXISTS "earnings_calendar_active_report_date_idx"
  ON "public"."earnings_calendar" ("is_active", "report_date");

