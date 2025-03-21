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
};

export type SupabaseTicker = {
  id: string;
  watchlist_id: string;
  symbol: string;
  created_at: string;
}; 