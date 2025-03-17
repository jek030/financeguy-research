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

// Add a function to format market cap
function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) {
    return `${(marketCap / 1e12).toFixed(2)}tln`;
  } else if (marketCap >= 1e9) {
    return `${(marketCap / 1e9).toFixed(2)}bln`;
  } else if (marketCap >= 1e6) {
    return `${(marketCap / 1e6).toFixed(2)}mln`;
  }
  return formatNumber(marketCap);
}

// Add a function to format date
function formatEarningsDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit', 
    year: 'numeric' 
  });
}

interface QuoteRowProps {
  symbol: string;
  watchlistId: string;
  onRemoveTicker: (watchlistId: string, symbol: string) => void;
}

function QuoteRow({ symbol, watchlistId, onRemoveTicker }: QuoteRowProps) {
  const { data: quote } = useQuote(symbol);

  return (
    <TableRow key={`${symbol}-${watchlistId}`} className="group">
      <TableCell className="py-2 sm:py-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link 
            href={`/search/${symbol}`}
            className="font-medium hover:underline text-blue-600 dark:text-blue-400 text-sm sm:text-base"
          >
            {symbol}
          </Link>
          {quote && (
            <Badge variant={quote.changesPercentage >= 0 ? "positive" : "destructive"} className="text-xs sm:text-sm">
              {formatPercentage(quote.changesPercentage)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
        {quote ? `$${formatNumber(quote.price)}` : "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {quote ? (
          <span className={cn(
            "font-medium text-xs sm:text-sm",
            quote.change >= 0 ? "text-positive" : "text-destructive"
          )}>
            {quote.change >= 0 ? '+' : '-'}{formatNumber(Math.abs(quote.change))}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
        {quote ? formatNumber(quote.volume) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
        {quote ? formatMarketCap(quote.marketCap) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
        {quote ? formatEarningsDate(quote.earningsAnnouncement) : "-"}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemoveTicker(watchlistId, symbol)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
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
  onRemoveWatchlist: (watchlistId: string) => void;
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
  onRemoveWatchlist,
}: WatchlistDetailProps) {
  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-4">
        {watchlist.isEditing ? (
          <div className="flex items-center gap-2 w-full">
            <Input
              value={editNameInput}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, onSaveWatchlistName)}
              className="text-base sm:text-xl font-semibold h-auto py-1"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onSaveWatchlistName}
              className="shrink-0"
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-xl font-semibold text-foreground">{watchlist.name}</h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleEditMode}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4 sm:mb-6">
          <Input
            placeholder="Enter ticker"
            value={newTickerInput}
            onChange={(e) => onNewTickerChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onAddTicker)}
            className="font-medium text-sm sm:text-base h-8 sm:h-10"
          />
          <Button 
            onClick={onAddTicker} 
            className="shrink-0 text-sm h-8 sm:h-10 px-3 sm:px-4"
          >
            Add Ticker
          </Button>
        </div>
        <SortableContext
          items={watchlist.tickers.map(t => `${t.symbol}-${watchlist.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Symbol</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Price</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Change ($)</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Volume</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Market Cap</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap">Next Earnings</TableHead>
                  <TableHead className="w-[40px] sm:w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={7} 
                      className="h-20 sm:h-24 text-center text-sm text-muted-foreground"
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
        <div className="mt-4 sm:mt-6 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onRemoveWatchlist(watchlist.id)}
            className="text-sm text-muted-foreground hover:text-destructive h-8 sm:h-9"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Delete watchlist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 