import { useState, useEffect } from 'react';
import { WatchlistCard } from '@/components/watchlist/types';
import { useQuote } from './FMP/useQuote';

const STORAGE_KEY = 'watchlists';

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState<WatchlistCard[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [newTickerInputs, setNewTickerInputs] = useState<{ [key: string]: string }>({});
  const [editNameInputs, setEditNameInputs] = useState<{ [key: string]: string }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      const savedWatchlists = localStorage.getItem(STORAGE_KEY);
      if (savedWatchlists) {
        const parsed = JSON.parse(savedWatchlists);
        setWatchlists(parsed.map((w: WatchlistCard) => ({ ...w, isEditing: false })));
      }
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlists));
    }
  }, [watchlists, isInitialized]);

  const addWatchlist = () => {
    const newWatchlist: WatchlistCard = {
      id: Date.now().toString(),
      name: `Watchlist ${watchlists.length + 1}`,
      tickers: [],
      isEditing: false,
    };
    setWatchlists([...watchlists, newWatchlist]);
    setNewTickerInputs({ ...newTickerInputs, [newWatchlist.id]: '' });
    setEditNameInputs({ ...editNameInputs, [newWatchlist.id]: newWatchlist.name });
    setSelectedWatchlist(newWatchlist.id);
  };

  const addTickerToWatchlist = async (watchlistId: string, symbol: string) => {
    if (!symbol) return;

    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (watchlist?.tickers.some(t => t.symbol === symbol)) return;

    const response = await fetch(`/api/fmp/quote?symbol=${symbol}`);
    if (!response.ok) return;

    const data = await response.json();
    const quote = data[0];
    if (!quote) return;

    setWatchlists(watchlists.map(watchlist => {
      if (watchlist.id === watchlistId) {
        return {
          ...watchlist,
          tickers: [...watchlist.tickers, quote],
        };
      }
      return watchlist;
    }));

    setNewTickerInputs({ ...newTickerInputs, [watchlistId]: '' });
  };

  const removeWatchlist = (watchlistId: string) => {
    setWatchlists(watchlists.filter(w => w.id !== watchlistId));
    if (selectedWatchlist === watchlistId) {
      setSelectedWatchlist(null);
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

  const saveWatchlistName = (watchlistId: string) => {
    setWatchlists(watchlists.map(watchlist => {
      if (watchlist.id === watchlistId) {
        return {
          ...watchlist,
          name: editNameInputs[watchlistId] || watchlist.name,
          isEditing: false,
        };
      }
      return watchlist;
    }));
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