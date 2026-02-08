-- Create earnings_calendar table
CREATE TABLE IF NOT EXISTS "public"."earnings_calendar" (
  "id" SERIAL PRIMARY KEY,
  "symbol" VARCHAR(10) NOT NULL,
  "report_date" DATE NOT NULL,
  "fiscal_date_ending" DATE,
  "eps_actual" DECIMAL(12, 4),
  "eps_estimated" DECIMAL(12, 4),
  "revenue_actual" BIGINT,
  "revenue_estimated" BIGINT,
  "report_time" VARCHAR(10),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("symbol", "report_date")
);

CREATE INDEX IF NOT EXISTS "earnings_calendar_report_date_idx" ON "public"."earnings_calendar" ("report_date");
CREATE INDEX IF NOT EXISTS "earnings_calendar_symbol_idx" ON "public"."earnings_calendar" ("symbol");

-- Create income_statements table
CREATE TABLE IF NOT EXISTS "public"."income_statements" (
  "id" SERIAL PRIMARY KEY,
  "symbol" VARCHAR(10) NOT NULL,
  "date" DATE NOT NULL,
  "period" VARCHAR(10) NOT NULL,
  "revenue" BIGINT,
  "net_income" BIGINT,
  "eps_diluted" DECIMAL(12, 4),
  "weighted_avg_shares" BIGINT,
  "cost_of_revenue" BIGINT,
  "gross_profit" BIGINT,
  "operating_income" BIGINT,
  "operating_expenses" BIGINT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("symbol", "date", "period")
);

CREATE INDEX IF NOT EXISTS "income_statements_symbol_idx" ON "public"."income_statements" ("symbol");
CREATE INDEX IF NOT EXISTS "income_statements_symbol_period_idx" ON "public"."income_statements" ("symbol", "period");
