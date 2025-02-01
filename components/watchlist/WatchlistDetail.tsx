import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Check, Pencil } from 'lucide-react';
import { WatchlistCard } from './types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useQuote } from '@/hooks/FMP/useQuote';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface QuoteRowProps {
  symbol: string;
  watchlistId: string;
  onRemoveTicker: (watchlistId: string, symbol: string) => void;
}

function QuoteRow({ symbol, watchlistId, onRemoveTicker }: QuoteRowProps) {
  const { data: quote } = useQuote(symbol);

  return (
    <TableRow key={`${symbol}-${watchlistId}`} className="group">
      <TableCell>
        <div className="flex items-center gap-2">
          <Link 
            href={`/search/${symbol}`}
            className="font-medium hover:underline text-foreground"
          >
            {symbol}
          </Link>
          {quote && (
            <Badge variant={quote.changesPercentage >= 0 ? "positive" : "destructive"}>
              {formatPercentage(quote.changesPercentage)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {quote ? `$${formatNumber(quote.price)}` : "-"}
      </TableCell>
      <TableCell>
        {quote ? (
          <span className={cn(
            "font-medium",
            quote.change >= 0 ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
          )}>
            ${formatNumber(quote.change)}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell className="font-medium">
        {quote ? formatNumber(quote.volume) : "-"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemoveTicker(watchlistId, symbol)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface WatchlistDetailProps {
  watchlist: WatchlistCard;
  editNameInput: string;
  onEditNameChange: (value: string) => void;
  onSaveWatchlistName: () => void;
  onToggleEditMode: () => void;
  newTickerInput: string;
  onNewTickerChange: (value: string) => void;
  onAddTicker: () => void;
  onKeyPress: (e: React.KeyboardEvent, action: () => void) => void;
  onRemoveTicker: (watchlistId: string, ticker: string) => void;
}

export function WatchlistDetail({
  watchlist,
  editNameInput,
  onEditNameChange,
  onSaveWatchlistName,
  onToggleEditMode,
  newTickerInput,
  onNewTickerChange,
  onAddTicker,
  onKeyPress,
  onRemoveTicker,
}: WatchlistDetailProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        {watchlist.isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <Input
              value={editNameInput}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, onSaveWatchlistName)}
              className="text-xl font-semibold h-auto py-1"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onSaveWatchlistName}
              className="shrink-0"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{watchlist.name}</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleEditMode}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter ticker"
            value={newTickerInput}
            onChange={(e) => onNewTickerChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onAddTicker)}
            className="font-medium"
          />
          <Button onClick={onAddTicker} className="shrink-0">
            Add Ticker
          </Button>
        </div>
        <SortableContext
          items={watchlist.tickers.map(t => `${t.symbol}-${watchlist.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Symbol</TableHead>
                  <TableHead className="font-semibold">Price</TableHead>
                  <TableHead className="font-semibold">Change</TableHead>
                  <TableHead className="font-semibold">Volume</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={5} 
                      className="h-24 text-center text-muted-foreground"
                    >
                      No tickers added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  watchlist.tickers.map((ticker) => (
                    <QuoteRow
                      key={`${ticker.symbol}-${watchlist.id}`}
                      symbol={ticker.symbol}
                      watchlistId={watchlist.id}
                      onRemoveTicker={onRemoveTicker}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
} 