"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, ArrowLeft } from 'lucide-react';
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
import { WatchlistSidebar } from '@/components/watchlist/WatchlistSidebar';
import { useWatchlist } from '@/hooks/useWatchlist';
import { Ticker } from '@/lib/types';
import { useAuth } from '@/lib/context/auth-context';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { pageStyles } from '@/components/ui/CompanyHeader';

export default function WatchlistPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    watchlists,
    selectedWatchlist,
    newTickerInputs,
    editNameInputs,
    isLoading: isWatchlistLoading,
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
  } = useWatchlist();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedTicker, setDraggedTicker] = useState<Ticker | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }),
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
      // Handle Watchlist Reordering
      if (active.data.current?.type === 'watchlist') {
        const oldIndex = watchlists.findIndex((item) => item.id === active.id);
        const newIndex = watchlists.findIndex((item) => item.id === over.id);
        const newWatchlists = arrayMove(watchlists, oldIndex, newIndex);
        updateWatchlists(newWatchlists);
      } 
      // Handle Ticker Reordering / Moving
      else {
        // Fallback: Try to get data from active.data.current, OR parse it from active.id
        let sourceWatchlistId = active.data.current?.watchlistId;
        let ticker = active.data.current?.ticker;

        // If data is missing, try to parse from ID: "symbol-watchlistId"
        if (!sourceWatchlistId || !ticker) {
            if (typeof active.id === 'string' && active.id.includes('-')) {
                // Find the LAST hyphen to split, as symbols might have hyphens? 
                // Actually, assuming UUIDs have hyphens, this is tricky. 
                // Better approach: We know the format is `${symbol}-${watchlistId}`
                // but UUIDs have hyphens.
                
                // Let's rely on finding the watchlist in our state that contains this ticker ID combination
                const foundWatchlist = watchlists.find(w => 
                    w.tickers.some(t => `${t.symbol}-${w.id}` === active.id)
                );
                
                if (foundWatchlist) {
                    sourceWatchlistId = foundWatchlist.id;
                    const foundTicker = foundWatchlist.tickers.find(t => `${t.symbol}-${foundWatchlist.id}` === active.id);
                    if (foundTicker) {
                        ticker = foundTicker;
                    }
                }
            }
        }
        
        // Safety check - if we STILL don't have data
        if (!sourceWatchlistId || !ticker) {
             console.error("Missing drag source data", { activeId: active.id });
             return;
        }
        
        // Determine target watchlist ID from the over node's data
        let targetWatchlistId = null;
        if (over.data.current?.type === 'watchlist') {
          targetWatchlistId = over.data.current.watchlist.id;
        } else if (over.data.current?.type === 'ticker') {
          targetWatchlistId = over.data.current.ticker.watchlistId;
        }

        if (targetWatchlistId && sourceWatchlistId === targetWatchlistId) {
          // Case 1: Reordering within same watchlist
          const updatedWatchlists = watchlists.map(watchlist => {
            if (watchlist.id === sourceWatchlistId) {
              const oldIndex = watchlist.tickers.findIndex(t => t.symbol === ticker.symbol);
              // Use the unique ID from dnd-kit to find the new index
              const newIndex = watchlist.tickers.findIndex(t => `${t.symbol}-${targetWatchlistId}` === over.id);
              
              if (oldIndex !== -1 && newIndex !== -1) {
                const newTickers = arrayMove(watchlist.tickers, oldIndex, newIndex);
                return { ...watchlist, tickers: newTickers };
              }
            }
            return watchlist;
          });
          updateWatchlists(updatedWatchlists);
        } else if (targetWatchlistId) {
          // Case 2: Moving ticker to a different watchlist
          
          // Optimistic update first to prevent UI snap-back
          const updatedWatchlists = watchlists.map(watchlist => {
             // Remove from source
            if (watchlist.id === sourceWatchlistId) {
              return {
                ...watchlist,
                tickers: watchlist.tickers.filter(t => t.symbol !== ticker.symbol)
              };
            }
            // Add to target
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

          // Perform Database Operations in background
          const removePromise = supabase
            .from('watchlist_tickers')
            .delete()
            .eq('watchlist_id', sourceWatchlistId)
            .eq('symbol', ticker.symbol);
          
          const addPromise = supabase
            .from('watchlist_tickers')
            .insert({
              watchlist_id: targetWatchlistId,
              symbol: ticker.symbol,
              // If moving to end of list, you might want to fetch max order_index first, 
              // but default 0 is fine if you reorder later.
            });
            
          Promise.all([removePromise, addPromise]).catch(error => {
             console.error('Error moving ticker:', error);
             // Optionally revert state here if needed
          });
        }
      }
    }

    setActiveId(null);
    setDraggedTicker(null);
  };

  // User not logged in
  if (!user && !isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <h1 className="text-2xl font-bold">You need to be logged in to view watchlists</h1>
        <p className="text-lg text-muted-foreground">Sign in to create and manage your watchlists</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  // Loading state - show while fetching watchlists
  if (isWatchlistLoading || isAuthLoading) {
    return (
      <div className={`flex items-center justify-center h-[calc(100vh-4rem)] ${pageStyles.gradientBg}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && !isWatchlistLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Error loading watchlists</h1>
        <p className="text-lg text-muted-foreground">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] w-full max-w-full overflow-hidden ${pageStyles.gradientBg}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className={cn(
                "w-full md:w-[280px] border-r border-border bg-background flex-shrink-0 flex flex-col transition-all duration-300",
                selectedWatchlist ? "hidden md:flex" : "flex"
            )}>
                <WatchlistSidebar 
                    watchlists={watchlists}
                    selectedId={selectedWatchlist}
                    defaultWatchlistId={defaultWatchlistId}
                    onSelect={setSelectedWatchlist}
                    onAdd={addWatchlist}
                    onSetDefault={setWatchlistAsDefault}
                />
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 overflow-hidden flex flex-col bg-background",
                !selectedWatchlist ? "hidden md:flex" : "flex"
            )}>
                {selectedWatchlist && watchlists.find(w => w.id === selectedWatchlist) ? (
                    <div className="flex flex-col h-full">
                         {/* Mobile Back Button */}
                         <div className="md:hidden p-2 border-b bg-card">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedWatchlist(null)} className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back to Lists
                            </Button>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-2 sm:p-4">
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
                         </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                        <div className="bg-muted/50 p-6 rounded-full mb-4">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                        <p className="font-medium">Select a watchlist to view details</p>
                    </div>
                )}
            </div>
        </div>

        <DragOverlay>
          {activeId && draggedTicker ? (
            <div className="bg-card p-2 rounded shadow-lg border text-sm font-medium">
              {draggedTicker.symbol}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
