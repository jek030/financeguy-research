-- Add default portfolio tab preference for the portfolio page
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_portfolio_tab TEXT DEFAULT 'positions';
