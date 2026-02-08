-- Widen symbol columns to handle international tickers (e.g., BAJAJHCARE.NS)
ALTER TABLE "public"."earnings_calendar" ALTER COLUMN "symbol" TYPE VARCHAR(30);
ALTER TABLE "public"."income_statements" ALTER COLUMN "symbol" TYPE VARCHAR(30);
