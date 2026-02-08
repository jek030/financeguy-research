-- Enable Row Level Security on both tables
ALTER TABLE "public"."earnings_calendar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."income_statements" ENABLE ROW LEVEL SECURITY;

-- earnings_calendar: Allow anyone to read (anon + authenticated)
CREATE POLICY "Allow public read access on earnings_calendar"
  ON "public"."earnings_calendar"
  FOR SELECT
  USING (true);

-- earnings_calendar: Only service_role can insert
CREATE POLICY "Allow service_role insert on earnings_calendar"
  ON "public"."earnings_calendar"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- earnings_calendar: Only service_role can update
CREATE POLICY "Allow service_role update on earnings_calendar"
  ON "public"."earnings_calendar"
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- earnings_calendar: Only service_role can delete
CREATE POLICY "Allow service_role delete on earnings_calendar"
  ON "public"."earnings_calendar"
  FOR DELETE
  TO service_role
  USING (true);

-- income_statements: Allow anyone to read (anon + authenticated)
CREATE POLICY "Allow public read access on income_statements"
  ON "public"."income_statements"
  FOR SELECT
  USING (true);

-- income_statements: Only service_role can insert
CREATE POLICY "Allow service_role insert on income_statements"
  ON "public"."income_statements"
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- income_statements: Only service_role can update
CREATE POLICY "Allow service_role update on income_statements"
  ON "public"."income_statements"
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- income_statements: Only service_role can delete
CREATE POLICY "Allow service_role delete on income_statements"
  ON "public"."income_statements"
  FOR DELETE
  TO service_role
  USING (true);
