import { useState, useEffect, useCallback } from 'react';
import { supabase, SupabaseUserPreferences } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';
import { toast } from 'sonner';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<SupabaseUserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setPreferences(data);
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Set default watchlist
  const setDefaultWatchlist = useCallback(async (watchlistId: string | null, watchlistName?: string) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      
      const { data, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          default_watchlist_id: watchlistId,
          updated_at: now,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setPreferences(data);
      
      // Show toast notification
      if (watchlistId) {
        toast.success('Default watchlist set', {
          description: watchlistName ? `"${watchlistName}" will now load first` : 'Your default watchlist has been updated',
        });
      } else {
        toast.info('Default watchlist removed', {
          description: 'The first watchlist will load by default',
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error setting default watchlist:', err);
      setError('Failed to set default watchlist');
      toast.error('Failed to set default watchlist');
      throw err;
    }
  }, [user]);

  // Set default portfolio
  const setDefaultPortfolio = useCallback(async (portfolioKey: number | null, portfolioName?: string) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      
      const { data, error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          default_portfolio_key: portfolioKey,
          updated_at: now,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      setPreferences(data);
      
      // Show toast notification
      if (portfolioKey) {
        toast.success('Default portfolio set', {
          description: portfolioName ? `"${portfolioName}" will now load first` : 'Your default portfolio has been updated',
        });
      } else {
        toast.info('Default portfolio removed', {
          description: 'The first portfolio will load by default',
        });
      }
      
      return data;
    } catch (err) {
      console.error('Error setting default portfolio:', err);
      setError('Failed to set default portfolio');
      toast.error('Failed to set default portfolio');
      throw err;
    }
  }, [user]);

  // Fetch preferences when user changes
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    defaultWatchlistId: preferences?.default_watchlist_id ?? null,
    defaultPortfolioKey: preferences?.default_portfolio_key ?? null,
    setDefaultWatchlist,
    setDefaultPortfolio,
    refetch: fetchPreferences,
  };
}

