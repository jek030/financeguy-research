"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
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

  const handleWatchlistSelect = (value: string) => {
    setSelectedWatchlist(value);
  };

  // Authentication loading state
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // User not logged in
  if (!user) {
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

  // Watchlist loading state
  if (isWatchlistLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading watchlists...</span>
      </div>
    );
  }

  // Error state
  if (error) {
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
        <div className="container mx-auto px-1 sm:px-4 py-2 sm:py-4">
          <div className="grid grid-cols-12 gap-2 sm:gap-6">
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-4">
                  <h2 className="text-sm sm:text-lg font-semibold">Watchlists</h2>
                  <div className="flex items-center gap-1 sm:gap-2">                 
                    <Button onClick={addWatchlist} size="sm" variant="outline" className="text-xs sm:text-sm h-7 sm:h-8">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-1 sm:pt-2">
                  <Combobox
                    options={watchlistOptions}
                    value={selectedWatchlist || undefined}
                    onSelect={handleWatchlistSelect}
                    placeholder="Select a watchlist"
                    emptyText="No watchlists found."
                  />
                </CardContent>
              </Card>
            </div>

            <div className="col-span-12 md:col-span-8 lg:col-span-9">
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