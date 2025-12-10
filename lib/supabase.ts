import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SupabaseWatchlist = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  watchlist_name: string;
  order_index: number; // Add this
};

export type SupabaseTicker = {
  id: string;
  watchlist_id: string;
  symbol: string;
  created_at: string;
  order_index: number; // Add this
};

export interface SupabasePortfolio {
  portfolio_key: number | string; // int8 can be returned as string
  created_at: string;
  user_id: string;
  user_email: string;
  portfolio_value: number;
  portfolio_name: string;
}

export interface SupabasePortfolioPosition {
  portfolio_key: number | string; // int8 can be returned as string
  trade_key: number | string; // int8 can be returned as string
  created_at: string;
  symbol: string;
  type: string;
  cost: number;
  quantity: number;
  net_cost: number;
  equity: number;
  percent_of_portfolio: number;
  initial_stop_loss: number;
  open_risk: number;
  open_heat: number;
  price_target_1: number;
  price_target_1_quantity: number;
  price_target_2: number;
  price_target_2_quantity: number;
  price_target_3: number;
  remaining_shares: number;
  realized_gain: number;
  open_date: string;
  close_date: string | null;
  days_in_trade: number;
} 