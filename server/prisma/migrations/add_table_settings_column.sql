-- Add table_settings JSONB column to user_preferences for per-table column visibility
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS table_settings JSONB DEFAULT '{}'::jsonb;
