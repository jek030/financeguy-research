import { useState, useEffect } from 'react';
import { WatchlistCard } from '@/components/watchlist/types';
import { Ticker } from '@/lib/types';
import { supabase, SupabaseWatchlist } from '@/lib/supabase';
import { useAuth } from '@/lib/context/auth-context';

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState<WatchlistCard[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [newTickerInputs, setNewTickerInputs] = useState<{ [key: string]: string }>({});
  const [editNameInputs, setEditNameInputs] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Convert Supabase watchlist to our app's format
  const mapSupabaseToWatchlist = (data: SupabaseWatchlist): WatchlistCard => ({
    id: data.id,
    name: data.watchlist_name,
    tickers: [], // For now, we won't store tickers in Supabase
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
        const { data, error } = await supabase
          .from('watchlists')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        if (data) {
          const mappedWatchlists = data.map(mapSupabaseToWatchlist);
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
          
          // Select first watchlist if available and none selected
          if (mappedWatchlists.length > 0 && !selectedWatchlist) {
            setSelectedWatchlist(mappedWatchlists[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching watchlists:', err);
        setError('Failed to load watchlists');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWatchlists();
  }, [user, selectedWatchlist]);

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
    if (!symbolInput) return;

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
      // Delete from Supabase
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

  const removeTicker = (watchlistId: string, symbol: string) => {
    setWatchlists(watchlists.map(watchlist => {
      if (watchlist.id === watchlistId) {
        return {
          ...watchlist,
          tickers: watchlist.tickers.filter(t => t.symbol !== symbol)
        };
      }
      return watchlist;
    }));
  };

  const updateWatchlists = (newWatchlists: WatchlistCard[]) => {
    setWatchlists(newWatchlists);
  };

  return {
    watchlists,
    selectedWatchlist,
    newTickerInputs,
    editNameInputs,
    isLoading,
    error,
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
  };
} 