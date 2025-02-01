"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWatchlistItem } from '@/components/watchlist/SortableWatchlistItem';
import { WatchlistDetail } from '@/components/watchlist/WatchlistDetail';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Ticker } from '@/lib/types';

export default function WatchlistPage() {
  const {
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

  return (
    <div className="flex flex-col">
      <div className="bg-background py-4 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold tracking-tight">Watchlists</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your stock watchlists with real-time data
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4 lg:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <h2 className="text-lg font-semibold">Your Watchlists</h2>
                  <Button onClick={addWatchlist} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </CardHeader>
                <CardContent>
                  <SortableContext
                    items={watchlists.map(w => w.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {watchlists.map((watchlist) => (
                        <SortableWatchlistItem 
                          key={watchlist.id} 
                          watchlist={watchlist}
                          selectedWatchlist={selectedWatchlist}
                          onSelect={setSelectedWatchlist}
                          onRemove={removeWatchlist}
                        />
                      ))}
                    </div>
                  </SortableContext>
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
                />
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId && draggedTicker ? (
            <div className="bg-card p-2 rounded shadow-lg border">
              {draggedTicker.symbol}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 