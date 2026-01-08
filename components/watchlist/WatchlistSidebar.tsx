import React from 'react';
import { WatchlistCard } from './types';
import { Button } from '@/components/ui/Button';
import { Plus, GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

interface WatchlistSidebarProps {
  watchlists: WatchlistCard[];
  selectedId: string | null;
  defaultWatchlistId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onSetDefault: (id: string | null) => void;
}

function SidebarItem({ 
  watchlist, 
  isSelected, 
  isDefault,
  onClick,
  onSetDefault 
}: { 
  watchlist: WatchlistCard, 
  isSelected: boolean, 
  isDefault: boolean,
  onClick: () => void,
  onSetDefault: () => void 
}) {
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
        {isDefault && (
          <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault();
                }}
                className={cn(
                  "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/50",
                  isDefault && "opacity-100"
                )}
              >
                <Star className={cn(
                  "h-3.5 w-3.5",
                  isDefault 
                    ? "fill-amber-400 text-amber-400" 
                    : "text-muted-foreground hover:text-amber-400"
                )} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {isDefault ? "Default watchlist" : "Set as default"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full bg-background/50 border",
          isSelected ? "text-accent-foreground" : "text-muted-foreground"
        )}>
          {watchlist.tickers.length}
        </span>
      </div>
    </div>
  );
}

export function WatchlistSidebar({ watchlists, selectedId, defaultWatchlistId, onSelect, onAdd, onSetDefault }: WatchlistSidebarProps) {
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
                isDefault={watchlist.id === defaultWatchlistId}
                onClick={() => onSelect(watchlist.id)}
                onSetDefault={() => onSetDefault(watchlist.id === defaultWatchlistId ? null : watchlist.id)}
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

