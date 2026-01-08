import { useState, useEffect, useCallback } from 'react';
import { WatchlistCard } from '@/components/watchlist/types';
import { Ticker } from '@/lib/types';
import { supabase, SupabaseWatchlist, SupabaseTicker } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';
import { useUserPreferences } from './useUserPreferences';

// Define a minimal ticker interface for initial loading
interface MinimalTicker {
  symbol: string;
}

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState<WatchlistCard[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [newTickerInputs, setNewTickerInputs] = useState<{ [key: string]: string }>({});
  const [editNameInputs, setEditNameInputs] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { defaultWatchlistId, setDefaultWatchlist, isLoading: prefsLoading } = useUserPreferences();

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
          
          // Select default watchlist or first watchlist if available and none selected
          if (mappedWatchlists.length > 0 && !selectedWatchlist) {
            // Check if user has a default watchlist set
            if (defaultWatchlistId && mappedWatchlists.some(w => w.id === defaultWatchlistId)) {
              setSelectedWatchlist(defaultWatchlistId);
            } else {
              setSelectedWatchlist(mappedWatchlists[0].id);
            }
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
  }, [user, selectedWatchlist, defaultWatchlistId, prefsLoading]);

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
      // Delete tickers first (foreign key constraint)
      const { error: tickerError } = await supabase
        .from('watchlist_tickers')
        .delete()
        .eq('watchlist_id', watchlistId);
        
      if (tickerError) throw tickerError;
      
      // Then delete the watchlist
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', watchlistId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Update local state
      setWatchlists(watchlists.filter(w => w.id !== watchlistId));
      
      if (selectedWatchlist === watchlistId) {
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
    // We process each watchlist to see if its tickers have changed order
    for (const newWatchlist of newWatchlists) {
      const oldWatchlist = watchlists.find(w => w.id === newWatchlist.id);
      
      // If we can't find the old one, or the order hasn't changed, skip
      if (!oldWatchlist) continue;
      
      const newSymbolOrder = newWatchlist.tickers.map(t => t.symbol).join(',');
      const oldSymbolOrder = oldWatchlist.tickers.map(t => t.symbol).join(',');

      if (newSymbolOrder !== oldSymbolOrder) {
        console.log(`Updating order for watchlist ${newWatchlist.name}...`);
        
        const updates = newWatchlist.tickers.map((ticker, index) => ({
          watchlist_id: newWatchlist.id,
          symbol: ticker.symbol,
          order_index: index,
        }));

        // Try with explicit constraint name which is safer for upserts
        const { error } = await supabase
          .from('watchlist_tickers')
          .upsert(updates, { onConflict: 'watchlist_id,symbol' });
          
        if (error) {
            console.error('Supabase Error (Ticker Order):', error);
            // Fallback: Try with explicit constraint name if column match fails
            if (error.code === '23505' || error.code === '409') { 
               console.log('Retrying with explicit constraint name...');
               await supabase
                .from('watchlist_tickers')
                .upsert(updates, { onConflict: 'watchlist_tickers_watchlist_id_symbol_key' });
            }
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
    selectedWatchlist,
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