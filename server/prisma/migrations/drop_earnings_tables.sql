-- Earnings calendar data is now fetched directly from FMP via Next.js API routes.
-- Drop the former Supabase-backed storage tables for environments applying migrations.
DROP TABLE IF EXISTS "public"."income_statements";
DROP TABLE IF EXISTS "public"."earnings_calendar";
