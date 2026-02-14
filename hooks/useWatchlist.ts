import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchlistCard } from '@/components/watchlist/types';
import { Ticker } from '@/lib/types';
import { supabase, SupabaseWatchlist, SupabaseTicker } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';
import { useUserPreferences } from './useUserPreferences';

// Define a minimal ticker interface for initial loading
interface MinimalTicker {
  symbol: string;
}

const SELECTED_WATCHLIST_KEY = 'financeguy-selected-watchlist';

export function useWatchlist() {
  // Load cached selected watchlist from localStorage
  const getCachedWatchlistId = (): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(SELECTED_WATCHLIST_KEY);
    } catch (e) {
      console.error('Error reading cached watchlist:', e);
      return null;
    }
  };

  const [watchlists, setWatchlists] = useState<WatchlistCard[]>([]);
  const [selectedWatchlistState, setSelectedWatchlistState] = useState<string | null>(getCachedWatchlistId());
  const [newTickerInputs, setNewTickerInputs] = useState<{ [key: string]: string }>({});
  const [editNameInputs, setEditNameInputs] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { defaultWatchlistId, setDefaultWatchlist, isLoading: prefsLoading } = useUserPreferences();

  // Wrapper function to update both state and localStorage
  const setSelectedWatchlist = useCallback((watchlistId: string | null) => {
    setSelectedWatchlistState(watchlistId);
    if (typeof window !== 'undefined') {
      try {
        if (watchlistId) {
          localStorage.setItem(SELECTED_WATCHLIST_KEY, watchlistId);
        } else {
          localStorage.removeItem(SELECTED_WATCHLIST_KEY);
        }
      } catch (e) {
        console.error('Error saving selected watchlist to cache:', e);
      }
    }
  }, []);
  
  // Track if we've done the initial watchlist selection to prevent re-selecting on navigation
  const hasInitiallySelected = useRef(false);
  
  // Track previous user to detect actual logout (not initial auth loading)
  const prevUserRef = useRef<typeof user | undefined>(undefined);
  
  // Reset the initial selection flag when user changes; only clear cache on actual logout
  useEffect(() => {
    const wasLoggedIn = prevUserRef.current !== undefined && prevUserRef.current !== null;
    const isLoggedOut = !user;
    prevUserRef.current = user;
    
    hasInitiallySelected.current = false;
    
    // Only clear cache when transitioning from logged-in to logged-out (actual logout),
    // not when user is null because auth is still loading on page refresh
    if (wasLoggedIn && isLoggedOut && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SELECTED_WATCHLIST_KEY);
      } catch (e) {
        console.error('Error clearing cached watchlist:', e);
      }
      setSelectedWatchlist(null);
    }
  }, [user, setSelectedWatchlist]);

  // Convert Supabase watchlist to our app's format
  const mapSupabaseToWatchlist = (data: SupabaseWatchlist): WatchlistCard => ({
    id: data.id,
    name: data.watchlist_name,
    tickers: [], // Will be populated with tickers later
    isEditing: false,
  });

  // Fetch watchlists when user is logged in
  useEffect(() => {
    const fetchWatchlists = async () => {
      if (!user) {
        setWatchlists([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Sort watchlists by order_index
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlists')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true });

        if (watchlistError) {
          throw watchlistError;
        }

        if (watchlistData) {
          const mappedWatchlists = watchlistData.map(mapSupabaseToWatchlist);
          
          // Fetch all tickers for all watchlists
          for (const watchlist of mappedWatchlists) {
            // Sort tickers by order_index
            const { data: tickerData, error: tickerError } = await supabase
              .from('watchlist_tickers')
              .select('*')
              .eq('watchlist_id', watchlist.id)
              .order('order_index', { ascending: true });
              
            if (tickerError) {
              console.error('Error fetching tickers:', tickerError);
              continue;
            }
            
            if (tickerData && tickerData.length > 0) {
              // Instead of fetching quote data here, just add the ticker symbols
              watchlist.tickers = tickerData.map(ticker => ({
                symbol: ticker.symbol
              })) as Ticker[];
            }
          }
          
          setWatchlists(mappedWatchlists);
          
          // Initialize inputs
          const tickerInputs: { [key: string]: string } = {};
          const nameInputs: { [key: string]: string } = {};
          mappedWatchlists.forEach(w => {
            tickerInputs[w.id] = '';
            nameInputs[w.id] = w.name;
          });
          
          setNewTickerInputs(tickerInputs);
          setEditNameInputs(nameInputs);
          
          // Only auto-select on initial load, not on subsequent renders
          // This prevents re-selecting when user navigates back to the list on mobile
          if (mappedWatchlists.length > 0 && !hasInitiallySelected.current) {
            hasInitiallySelected.current = true;
            
            // On mobile/small screens (< 768px), show the list first instead of auto-selecting
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            if (!isMobile) {
              // Read directly from localStorage (not state, which may be stale in this closure)
              const cachedId = getCachedWatchlistId();
              
              if (cachedId && mappedWatchlists.some(w => w.id === cachedId)) {
                // Cached selection is still valid — restore it
                setSelectedWatchlist(cachedId);
              } else if (defaultWatchlistId && mappedWatchlists.some(w => w.id === defaultWatchlistId)) {
                // Fall back to default watchlist
                setSelectedWatchlist(defaultWatchlistId);
              } else {
                // Fall back to first watchlist
                setSelectedWatchlist(mappedWatchlists[0].id);
              }
            }
            // On mobile, selectedWatchlist stays null so the list is shown first
          }
        }
      } catch (err) {
        console.error('Error fetching watchlists:', err);
        setError('Failed to load watchlists');
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for preferences to load before fetching watchlists
    if (!prefsLoading) {
      fetchWatchlists();
    }
    // Note: selectedWatchlist intentionally excluded to prevent re-fetch on navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, defaultWatchlistId, prefsLoading]);

  // Add a new watchlist
  const addWatchlist = async () => {
    if (!user) return;

    try {
      const newWatchlistName = `Watchlist ${watchlists.length + 1}`;
      
      // Insert into Supabase
      const { data, error } = await supabase
        .from('watchlists')
        .insert({
          watchlist_name: newWatchlistName,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        const newWatchlist = mapSupabaseToWatchlist(data);
        
        setWatchlists([...watchlists, newWatchlist]);
        setNewTickerInputs({ ...newTickerInputs, [newWatchlist.id]: '' });
        setEditNameInputs({ ...editNameInputs, [newWatchlist.id]: newWatchlist.name });
        setSelectedWatchlist(newWatchlist.id);
      }
    } catch (err) {
      console.error('Error adding watchlist:', err);
      setError('Failed to add watchlist');
    }
  };

  const addTickerToWatchlist = async (watchlistId: string, symbolInput: string) => {
    if (!symbolInput || !user) return;

    // Split the input by commas and trim whitespace
    const symbols = symbolInput.split(',').map(s => s.trim()).filter(s => s);
    if (symbols.length === 0) return;

    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (!watchlist) return;

    // Process each symbol
    const addedTickers: Ticker[] = [];
    for (const symbol of symbols) {
      // Skip if already in watchlist
      if (watchlist.tickers.some(t => t.symbol.toLowerCase() === symbol.toLowerCase())) continue;

      try {
        const response = await fetch(`/api/fmp/quote?symbol=${symbol}`);
        if (!response.ok) continue;

        const data = await response.json();
        const quote = data[0];
        if (!quote) continue;

        addedTickers.push(quote);
        
        // Add to Supabase
        const { error } = await supabase
          .from('watchlist_tickers')
          .insert({
            watchlist_id: watchlistId,
            symbol: quote.symbol,
          });
          
        if (error) {
          console.error(`Error adding ticker ${symbol} to database:`, error);
        }
      } catch (error) {
        console.error(`Error adding ticker ${symbol}:`, error);
      }
    }

    if (addedTickers.length === 0) return;

    setWatchlists(watchlists.map(w => {
      if (w.id === watchlistId) {
        return {
          ...w,
          tickers: [...w.tickers, ...addedTickers],
        };
      }
      return w;
    }));

    setNewTickerInputs({ ...newTickerInputs, [watchlistId]: '' });
  };

  const removeWatchlist = async (watchlistId: string) => {
    if (!user) return;

    try {
      // Verify this watchlist belongs to the current user before deleting
      const { data: watchlistData, error: verifyError } = await supabase
        .from('watchlists')
        .select('id')
        .eq('id', watchlistId)
        .eq('user_id', user.id)
        .single();

      if (verifyError || !watchlistData) {
        throw new Error('Watchlist not found or access denied');
      }

      // Delete tickers first (foreign key constraint)
      // Use select() to verify rows were actually deleted (RLS can silently block deletes)
      const { data: deletedTickers, error: tickerError } = await supabase
        .from('watchlist_tickers')
        .delete()
        .eq('watchlist_id', watchlistId)
        .select();
        
      if (tickerError) throw tickerError;
      
      console.log(`[watchlist] Deleted ${deletedTickers?.length ?? 0} tickers from watchlist ${watchlistId}`);

      // Then delete the watchlist itself
      const { data: deletedWatchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', user.id)
        .select();
      
      if (watchlistError) throw watchlistError;

      if (!deletedWatchlist || deletedWatchlist.length === 0) {
        throw new Error('Failed to delete watchlist — RLS policy may have blocked the operation');
      }
      
      // Update local state
      setWatchlists(watchlists.filter(w => w.id !== watchlistId));
      
      if (selectedWatchlistState === watchlistId) {
        const remainingWatchlists = watchlists.filter(w => w.id !== watchlistId);
        setSelectedWatchlist(remainingWatchlists.length > 0 ? remainingWatchlists[0].id : null);
      }
    } catch (err) {
      console.error('Error removing watchlist:', err);
      setError('Failed to delete watchlist');
    }
  };

  const toggleEditMode = (watchlistId: string) => {
    setWatchlists(watchlists.map(watchlist => {
      if (watchlist.id === watchlistId) {
        if (!watchlist.isEditing) {
          setEditNameInputs({ ...editNameInputs, [watchlistId]: watchlist.name });
        }
        return { ...watchlist, isEditing: !watchlist.isEditing };
      }
      return watchlist;
    }));
  };

  const saveWatchlistName = async (watchlistId: string) => {
    if (!user) return;
    
    const newName = editNameInputs[watchlistId] || '';
    if (!newName.trim()) return;
    
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('watchlists')
        .update({ 
          watchlist_name: newName,
          updated_at: new Date().toISOString()
        })
        .eq('id', watchlistId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setWatchlists(watchlists.map(watchlist => {
        if (watchlist.id === watchlistId) {
          return {
            ...watchlist,
            name: newName,
            isEditing: false,
          };
        }
        return watchlist;
      }));
    } catch (err) {
      console.error('Error saving watchlist name:', err);
      setError('Failed to update watchlist name');
    }
  };

  const removeTicker = async (watchlistId: string, symbol: string) => {
    if (!user) return;
    
    try {
      // Remove from Supabase
      const { error } = await supabase
        .from('watchlist_tickers')
        .delete()
        .match({ watchlist_id: watchlistId, symbol: symbol });
        
      if (error) throw error;
      
      // Update local state
      setWatchlists(watchlists.map(watchlist => {
        if (watchlist.id === watchlistId) {
          return {
            ...watchlist,
            tickers: watchlist.tickers.filter(t => t.symbol !== symbol)
          };
        }
        return watchlist;
      }));
    } catch (err) {
      console.error('Error removing ticker:', err);
      setError('Failed to remove ticker');
    }
  };

  const updateWatchlists = async (newWatchlists: WatchlistCard[]) => {
    // 1. Optimistically update local state immediately
    setWatchlists(newWatchlists);

    // 2. Persist Watchlist Order
    if (newWatchlists.map(w => w.id).join(',') !== watchlists.map(w => w.id).join(',')) {
      const updates = newWatchlists.map((watchlist, index) => ({
        id: watchlist.id,
        watchlist_name: watchlist.name,
        user_id: user?.id,
        order_index: index,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('watchlists')
        .upsert(updates, { onConflict: 'id' });
        
      if (error) console.error('Supabase Error (Watchlist Order):', error);
    } 
    
    // 3. Persist Ticker Order
    // We process each watchlist to see if its tickers have changed order.
    // Use individual UPDATE calls (not upsert) since we are only reordering existing rows.
    for (const newWatchlist of newWatchlists) {
      const oldWatchlist = watchlists.find(w => w.id === newWatchlist.id);
      
      // If we can't find the old one, or the order hasn't changed, skip
      if (!oldWatchlist) continue;
      
      const newSymbolOrder = newWatchlist.tickers.map(t => t.symbol).join(',');
      const oldSymbolOrder = oldWatchlist.tickers.map(t => t.symbol).join(',');

      if (newSymbolOrder !== oldSymbolOrder) {
        console.log(`Updating order for watchlist ${newWatchlist.name}...`);
        
        // Update each ticker's order_index individually
        const updatePromises = newWatchlist.tickers.map((ticker, index) =>
          supabase
            .from('watchlist_tickers')
            .update({ order_index: index })
            .eq('watchlist_id', newWatchlist.id)
            .eq('symbol', ticker.symbol)
        );

        const results = await Promise.all(updatePromises);
        const failedUpdates = results.filter(r => r.error);
        
        if (failedUpdates.length > 0) {
          console.error('Supabase Error (Ticker Order): Some updates failed:', failedUpdates.map(r => r.error));
        } else {
          console.log('Order updated successfully');
        }
      }
    }
  };

  // Set a watchlist as the default
  const setWatchlistAsDefault = async (watchlistId: string | null) => {
    try {
      const watchlistName = watchlistId 
        ? watchlists.find(w => w.id === watchlistId)?.name 
        : undefined;
      await setDefaultWatchlist(watchlistId, watchlistName);
    } catch (err) {
      console.error('Error setting default watchlist:', err);
      setError('Failed to set default watchlist');
    }
  };

  return {
    watchlists,
    selectedWatchlist: selectedWatchlistState,
    newTickerInputs,
    editNameInputs,
    isLoading,
    error,
    defaultWatchlistId,
    setSelectedWatchlist,
    setNewTickerInputs,
    setEditNameInputs,
    addWatchlist,
    addTickerToWatchlist,
    removeWatchlist,
    toggleEditMode,
    saveWatchlistName,
    removeTicker,
    updateWatchlists,
    setWatchlistAsDefault,
  };
} 