"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { WatchlistDetail } from '@/components/watchlist/WatchlistDetail';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Ticker } from '@/lib/types';
import { useAuth } from '@/lib/context/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

export default function WatchlistPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    watchlists,
    selectedWatchlist,
    newTickerInputs,
    editNameInputs,
    isLoading: isWatchlistLoading,
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
  } = useWatchlist();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicker, setDraggedTicker] = useState<Ticker | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    if (active.data.current?.type === 'ticker') {
      setDraggedTicker(active.data.current.ticker);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      if (active.data.current?.type === 'watchlist') {
        const oldIndex = watchlists.findIndex((item) => item.id === active.id);
        const newIndex = watchlists.findIndex((item) => item.id === over.id);
        const newWatchlists = arrayMove(watchlists, oldIndex, newIndex);
        updateWatchlists(newWatchlists);
      } else if (active.data.current?.type === 'ticker') {
        const sourceWatchlistId = active.data.current.watchlistId;
        const ticker = active.data.current.ticker;
        
        const [, targetWatchlistId] = (typeof over.id === 'string' && over.id.includes('-')) 
          ? over.id.split('-')
          : [null, over.id as string];

        if (sourceWatchlistId === targetWatchlistId) {
          const updatedWatchlists = watchlists.map(watchlist => {
            if (watchlist.id === sourceWatchlistId) {
              const oldIndex = watchlist.tickers.findIndex(t => t.symbol === ticker.symbol);
              const newIndex = watchlist.tickers.findIndex(t => `${t.symbol}-${targetWatchlistId}` === over.id);
              
              if (oldIndex !== -1 && newIndex !== -1) {
                const newTickers = arrayMove(watchlist.tickers, oldIndex, newIndex);
                return {
                  ...watchlist,
                  tickers: newTickers
                };
              }
            }
            return watchlist;
          });
          updateWatchlists(updatedWatchlists);
        } else {
          // Moving ticker between watchlists - need to update database
          
          // First remove from source watchlist
          const removePromise = supabase
            .from('watchlist_tickers')
            .delete()
            .eq('watchlist_id', sourceWatchlistId)
            .eq('symbol', ticker.symbol);
          
          // Then add to target watchlist
          const addPromise = supabase
            .from('watchlist_tickers')
            .insert({
              watchlist_id: targetWatchlistId,
              symbol: ticker.symbol,
            });
          
          // Execute database operations
          Promise.all([removePromise, addPromise])
            .then(() => {
              // Then update local state
              const updatedWatchlists = watchlists.map(watchlist => {
                if (watchlist.id === sourceWatchlistId) {
                  return {
                    ...watchlist,
                    tickers: watchlist.tickers.filter(t => t.symbol !== ticker.symbol)
                  };
                }
                if (watchlist.id === targetWatchlistId) {
                  if (!watchlist.tickers.some(t => t.symbol === ticker.symbol)) {
                    return {
                      ...watchlist,
                      tickers: [...watchlist.tickers, ticker]
                    };
                  }
                }
                return watchlist;
              });
              updateWatchlists(updatedWatchlists);
            })
            .catch(error => {
              console.error('Error moving ticker between watchlists:', error);
            });
        }
      }
    }

    setActiveId(null);
    setDraggedTicker(null);
  };

  // Convert watchlists to options format for Combobox
  const watchlistOptions = watchlists.map(watchlist => ({
    label: watchlist.name,
    value: watchlist.id
  }));

  // User not logged in
  if (!user && !isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1 className="text-2xl font-bold">You need to be logged in to view watchlists</h1>
        <p className="text-lg text-muted-foreground">Sign in to create and manage your watchlists</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  // Error state
  if (error && !isWatchlistLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h1 className="text-2xl font-bold text-destructive">Error loading watchlists</h1>
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="container-fluid mx-auto px-1 sm:px-4 py-2 sm:py-4 w-full max-w-full">
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-3 mt-2">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 md:mb-0">Watchlists</h1>
              <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">              
                <Select
                  value={selectedWatchlist || undefined}
                  onValueChange={setSelectedWatchlist}
                  disabled={isWatchlistLoading}
                >
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue>
                      {isWatchlistLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading watchlists...</span>
                        </div>
                      ) : (
                        <span>Select a watchlist</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {watchlistOptions.map((watchlist) => (
                      <SelectItem key={watchlist.value} value={watchlist.value}>
                        {watchlist.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={addWatchlist} 
                  variant="outline" 
                  size="default"
                  className="whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>
          <div className="w-full">
            {selectedWatchlist && (
              <WatchlistDetail
                watchlist={watchlists.find(w => w.id === selectedWatchlist)!}
                editNameInput={editNameInputs[selectedWatchlist] || ''}
                onEditNameChange={(value: string) => setEditNameInputs({
                  ...editNameInputs,
                  [selectedWatchlist]: value,
                })}
                onSaveWatchlistName={() => saveWatchlistName(selectedWatchlist)}
                onToggleEditMode={() => toggleEditMode(selectedWatchlist)}
                newTickerInput={newTickerInputs[selectedWatchlist] || ''}
                onNewTickerChange={(value: string) => setNewTickerInputs({
                  ...newTickerInputs,
                  [selectedWatchlist]: value,
                })}
                onAddTicker={() => addTickerToWatchlist(selectedWatchlist, newTickerInputs[selectedWatchlist])}
                onKeyPress={handleKeyPress}
                onRemoveTicker={removeTicker}
                onRemoveWatchlist={removeWatchlist}
              />
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId && draggedTicker ? (
            <div className="bg-card p-1.5 sm:p-2 rounded shadow-lg border text-sm">
              {draggedTicker.symbol}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 