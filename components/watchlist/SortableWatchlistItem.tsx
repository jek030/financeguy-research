import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WatchlistCard } from './types';
import { Button } from '@/components/ui/Button';
import { GripVertical, X } from 'lucide-react';

interface Props {
  watchlist: WatchlistCard;
  selectedWatchlist: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SortableWatchlistItem({ watchlist, selectedWatchlist, onSelect, onRemove }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: watchlist.id,
    data: {
      type: 'watchlist',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
        selectedWatchlist === watchlist.id ? 'bg-accent' : 'hover:bg-accent/50'
      }`}
      onClick={() => onSelect(watchlist.id)}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <span className="flex-1">{watchlist.name}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(watchlist.id);
        }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
} 