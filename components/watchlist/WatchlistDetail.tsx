import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Check, Pencil, Download } from 'lucide-react';
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
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQueries } from '@tanstack/react-query';
import type { Ticker } from '@/lib/types';

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
      <TableCell className="py-1.5 sm:py-2">
        <div className="flex items-center gap-1">
          <Link 
            href={`/search/${symbol}`}
            className="font-medium hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm"
          >
            {symbol}
          </Link>
        </div>
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap py-1.5 sm:py-2">
        {quote ? `$${formatNumber(quote.price)}` : "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap py-1.5 sm:py-2">
        {quote ? (
          <span className={cn(
            "font-medium text-xs sm:text-sm",
            quote.change >= 0 ? "text-positive" : "text-destructive"
          )}>
            {quote.change >= 0 ? '+' : '-'}{formatNumber(Math.abs(quote.change))}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell className="whitespace-nowrap py-1.5 sm:py-2">
        {quote ? (
          <span className={cn(
            "font-medium text-xs sm:text-sm",
            quote.changesPercentage >= 0 ? "text-positive" : "text-destructive"
          )}>
            {quote.changesPercentage >= 0 ? '+' : ''}{formatPercentage(quote.changesPercentage)}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap py-1.5 sm:py-2">
        {quote ? formatNumber(quote.volume) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap py-1.5 sm:py-2">
        {quote ? formatMarketCap(quote.marketCap) : "-"}
      </TableCell>
      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap py-1.5 sm:py-2">
        {quote ? formatEarningsDate(quote.earningsAnnouncement) : "-"}
      </TableCell>
      <TableCell className="py-1.5 sm:py-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemoveTicker(watchlistId, symbol)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 sm:h-7 sm:w-7"
        >
          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface ExportButtonProps {
  watchlist: WatchlistCard;
}

async function fetchQuote(symbol: string): Promise<Ticker[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/quote?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch quote data');
  }

  return response.json();
}

function ExportButton({ watchlist }: ExportButtonProps) {
  // Use the same query keys as the main useQuote hook to share cache
  const quoteResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['quote', ticker.symbol],
      queryFn: () => fetchQuote(ticker.symbol),
      select: (data: Ticker[]) => data[0],
      enabled: Boolean(ticker.symbol),
      // Use staleTime: Infinity to prevent automatic refetching
      staleTime: Infinity, 
      // Disable refetchInterval to avoid refreshing during export
      refetchInterval: 0, 
    }))
  });

  const handleExport = () => {
    // Create CSV header
    const headers = ['Symbol', 'Price', 'Change ($)', 'Change (%)', 'Volume', 'Market Cap', 'Next Earnings'];
    const csvRows = [headers.map(header => `"${header}"`)];

    // Use the data that's already loaded
    watchlist.tickers.forEach((ticker, index) => {
      const quote = quoteResults[index].data;
      const row = [
        `"${ticker.symbol}"`,
        quote ? `"$${formatNumber(quote.price)}"` : '""',
        quote ? `"${quote.change >= 0 ? '+' : '-'}${formatNumber(Math.abs(quote.change))}"` : '""',
        quote ? `"${quote.changesPercentage >= 0 ? '+' : ''}${formatPercentage(quote.changesPercentage)}"` : '""',
        quote ? `"${formatNumber(quote.volume)}"` : '""',
        quote ? `"${formatMarketCap(quote.marketCap)}"` : '""',
        quote ? `"${formatEarningsDate(quote.earningsAnnouncement)}"` : '""'
      ];
      csvRows.push(row);
    });

    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${watchlist.name.toLowerCase().replace(/\s+/g, '-')}-watchlist.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={handleExport}
      className="h-7 w-7 sm:h-8 sm:w-8"
      title="Export watchlist"
    >
      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
    </Button>
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-3">
        {watchlist.isEditing ? (
          <div className="flex items-center gap-1 sm:gap-2 w-full">
            <Input
              value={editNameInput}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, onSaveWatchlistName)}
              className="text-sm sm:text-xl font-semibold h-7 sm:h-8 py-0.5"
              autoFocus
            />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onSaveWatchlistName}
              className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
            >
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            <h2 className="text-sm sm:text-xl font-semibold text-foreground">{watchlist.name}</h2>
            <div className="flex items-center gap-1">
              <ExportButton watchlist={watchlist} />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onToggleEditMode}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8"
              >
                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
          <Input
            placeholder="Enter ticker"
            value={newTickerInput}
            onChange={(e) => onNewTickerChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onAddTicker)}
            className="font-medium text-xs sm:text-sm h-7 sm:h-8"
          />
          <Button 
            onClick={onAddTicker} 
            className="shrink-0 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
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
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Symbol</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Price</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Change ($)</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Change (%)</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Volume</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Market Cap</TableHead>
                  <TableHead className="font-semibold text-xs sm:text-sm whitespace-nowrap py-2 sm:py-3">Next Earnings</TableHead>
                  <TableHead className="w-[35px] sm:w-[45px] py-2 sm:py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={7} 
                      className="h-16 sm:h-20 text-center text-xs sm:text-sm text-muted-foreground"
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
        <div className="mt-3 sm:mt-4 flex justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onRemoveWatchlist(watchlist.id)}
            className="text-xs sm:text-sm text-muted-foreground hover:text-destructive h-7 sm:h-8"
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Delete watchlist
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 