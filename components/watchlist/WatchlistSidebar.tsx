import React from 'react';
import { WatchlistCard } from './types';
import { Button } from '@/components/ui/Button';
import { Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WatchlistSidebarProps {
  watchlists: WatchlistCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

function SidebarItem({ watchlist, isSelected, onClick }: { watchlist: WatchlistCard, isSelected: boolean, onClick: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
    isDragging
  } = useSortable({
    id: watchlist.id,
    data: {
      type: 'watchlist',
      watchlist,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
        <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border border-dashed border-primary/50 bg-accent/20 mb-1 opacity-50",
          "h-[52px]" // Approximate height to match content
        )}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center justify-between p-2 pl-3 rounded-lg cursor-pointer transition-all mb-1",
        isSelected 
            ? "bg-accent text-accent-foreground shadow-sm" 
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        isOver && "bg-accent/50 ring-2 ring-primary/20"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 truncate flex-1">
        <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab hover:text-foreground/80 text-muted-foreground/50"
            onClick={(e) => e.stopPropagation()}
        >
            <GripVertical className="h-4 w-4" />
        </div>
        <span className="font-medium truncate text-sm">{watchlist.name}</span>
      </div>
      <span className={cn(
        "text-xs px-2 py-0.5 rounded-full bg-background/50 border",
        isSelected ? "text-accent-foreground" : "text-muted-foreground"
      )}>
        {watchlist.tickers.length}
      </span>
    </div>
  );
}

export function WatchlistSidebar({ watchlists, selectedId, onSelect, onAdd }: WatchlistSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-card/30 border-r border-border/50">
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card/50">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">My Lists</h2>
        <Button onClick={onAdd} size="icon" variant="ghost" className="h-8 w-8 hover:bg-background">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <SortableContext items={watchlists.map(w => w.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {watchlists.map(watchlist => (
                <SidebarItem
                key={watchlist.id}
                watchlist={watchlist}
                isSelected={watchlist.id === selectedId}
                onClick={() => onSelect(watchlist.id)}
                />
            ))}
          </div>
        </SortableContext>
        
        {watchlists.length === 0 && (
            <div className="text-center py-8 px-4">
                <p className="text-sm text-muted-foreground mb-4">No watchlists yet</p>
                <Button onClick={onAdd} variant="outline" size="sm" className="w-full">
                    Create First List
                </Button>
            </div>
        )}
      </ScrollArea>
    </div>
  );
}

