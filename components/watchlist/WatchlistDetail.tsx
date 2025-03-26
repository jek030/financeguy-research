import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Check, Pencil, Download, Plus } from 'lucide-react';
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
import { useProfile } from '@/hooks/FMP/useProfile';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQueries } from '@tanstack/react-query';
import type { Ticker, CompanyProfile } from '@/lib/types';
import { formatMarketCap } from '@/lib/utils';

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
  const { data: quote, isLoading: isQuoteLoading } = useQuote(symbol);
  const { data: profile, isLoading: isProfileLoading } = useProfile(symbol);

  return (
    <TableRow key={`${symbol}-${watchlistId}`} className="group">
      <TableCell className="sticky left-0 bg-background">
        <div className="flex items-center gap-2">
          <Link 
            href={`/search/${symbol}`}
            className="hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm"
          >
            {symbol}
          </Link>
        </div>
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? `$${formatNumber(quote.price)}` : "-"}
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? (
          <span className={cn(
            "text-xs sm:text-sm",
            quote.change >= 0 ? "text-positive" : "text-destructive"
          )}>
            {quote.change >= 0 ? '+' : '-'}{formatNumber(Math.abs(quote.change))}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? (
          <span className={quote.changesPercentage >= 0 ? "text-positive" : "text-destructive"}>
            {quote.changesPercentage >= 0 ? '+' : ''}{formatPercentage(quote.changesPercentage)}
          </span>
        ) : "-"}
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? formatNumber(quote.volume) : "-"}
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? formatMarketCap(quote.marketCap) : "-"}
      </TableCell>
      <TableCell>
        {!isProfileLoading && profile && profile.sector ? (
          <Link 
            href={`/scans/sectors/${encodeURIComponent(profile.sector)}`}
            className="hover:underline text-blue-600 dark:text-blue-400"
          >
            {profile.sector}
          </Link>
        ) : "-"}
      </TableCell>
      <TableCell>
        {!isProfileLoading && profile && profile.sector && profile.industry ? (
          <Link 
            href={`/scans/sectors/${encodeURIComponent(profile.sector)}/industry/${encodeURIComponent(profile.industry)}`}
            className="hover:underline text-blue-600 dark:text-blue-400"
          >
            {profile.industry}
          </Link>
        ) : "-"}
      </TableCell>
      <TableCell>
        {!isQuoteLoading && quote ? formatEarningsDate(quote.earningsAnnouncement) : "-"}
      </TableCell>
      <TableCell>
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

async function fetchProfile(symbol: string): Promise<CompanyProfile[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/profile?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch profile data');
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

  const profileResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['profile', ticker.symbol],
      queryFn: () => fetchProfile(ticker.symbol),
      select: (data: CompanyProfile[]) => data[0],
      enabled: Boolean(ticker.symbol),
      staleTime: Infinity,
      refetchInterval: 0,
    }))
  });

  const handleExport = () => {
    // Create CSV header
    const headers = ['Symbol', 'Price', 'Change ($)', 'Change (%)', 'Volume', 'Market Cap', 'Sector', 'Industry', 'Next Earnings'];
    const csvRows = [headers.map(header => `"${header}"`)];

    // Use the data that's already loaded
    watchlist.tickers.forEach((ticker, index) => {
      const quote = quoteResults[index].data;
      const profile = profileResults[index].data;
      const row = [
        `"${ticker.symbol}"`,
        quote ? `"$${formatNumber(quote.price)}"` : '""',
        quote ? `"${quote.change >= 0 ? '+' : '-'}${formatNumber(Math.abs(quote.change))}"` : '""',
        quote ? `"${quote.changesPercentage >= 0 ? '+' : ''}${formatPercentage(quote.changesPercentage)}"` : '""',
        quote ? `"${formatNumber(quote.volume)}"` : '""',
        quote ? `"${formatMarketCap(quote.marketCap)}"` : '""',
        profile && profile.sector ? `"${profile.sector}"` : '""',
        profile && profile.industry ? `"${profile.industry}"` : '""',
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
    <Card className="border-border shadow-sm w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-3 sm:px-6 px-3">
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
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 mr-2">
              <h2 className="text-base sm:text-xl font-semibold text-foreground truncate">{watchlist.name}</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ExportButton watchlist={watchlist} />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onToggleEditMode}
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
              >
                <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="sm:px-6 px-3">
        <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
          <Input
            placeholder="Enter tickers (e.g. AAPL, MSFT, TSLA)"
            value={newTickerInput}
            onChange={(e) => onNewTickerChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onAddTicker)}
            className="text-xs sm:text-sm h-7 sm:h-8"
          />
          <Button 
            onClick={onAddTicker}
            title="Add ticker"
            className="h-7 sm:h-8 whitespace-nowrap flex-shrink-0 min-w-0 px-2 sm:px-3"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 md:mr-1" />
            <span className="hidden md:inline">Add Ticker</span>
            <span className="inline md:hidden ml-0.5">Add</span>
          </Button>
        </div>
        <SortableContext
          items={watchlist.tickers.map(t => `${t.symbol}-${watchlist.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rounded-md border border-border overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 bg-background">Symbol</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Change ($)</TableHead>
                  <TableHead>Change (%)</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Market Cap</TableHead> 
                  <TableHead>Sector</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Next Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={10} 
                      className="h-12 sm:h-12 text-center text-xs sm:text-sm text-muted-foreground"
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