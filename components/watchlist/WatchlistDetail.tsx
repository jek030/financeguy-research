import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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
import { usePriceChanges } from '@/hooks/FMP/usePriceChanges';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQueries } from '@tanstack/react-query';
import type { Ticker, CompanyProfile } from '@/lib/types';
import { formatMarketCap } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';

// Helper function to get today's date
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
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

// Helper component for price change cells with tooltips
interface PriceChangeCellProps {
  symbol: string;
  period: '1Y' | '3Y' | '5Y';
}

function PriceChangeCell({ symbol, period }: PriceChangeCellProps) {
  const { data: priceChanges, isLoading } = usePriceChanges({ symbol });
  
  if (isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }

  const periodData = period === '1Y' ? priceChanges?.oneYear : 
                    period === '3Y' ? priceChanges?.threeYear : 
                    priceChanges?.fiveYear;
  
  if (!periodData) return <span className="text-muted-foreground">-</span>;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };
  
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "cursor-help text-xs sm:text-sm",
            periodData.changePercent >= 0 ? "text-positive" : "text-destructive"
          )}>
            {periodData.changePercent >= 0 ? '+' : ''}{formatPercentage(periodData.changePercent)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={5}>
          <div className="space-y-1">
            <p>Current: ${formatNumber(periodData.currentPrice)} ({formatDate(periodData.currentDate)})</p>
            <p>{period} Ago: ${formatNumber(periodData.historicalPrice)} ({formatDate(periodData.historicalDate)})</p>
            <p className="text-xs text-muted-foreground mt-1">
              {periodData.changePercent >= 0 ? 'Gain' : 'Loss'} of {formatPercentage(Math.abs(periodData.changePercent))} over {period.toLowerCase()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface QuoteRowProps {
  symbol: string;
  watchlistId: string;
  onRemoveTicker: (watchlistId: string, symbol: string) => void;
}

function LoadingRow() {
  return (
    <TableRow>
      {Array(13).fill(0).map((_, i) => (
        <TableCell key={i} className={cn(i === 0 && "sticky left-0 bg-background")}>
          <Skeleton className="h-4 w-16" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function QuoteRow({ symbol, watchlistId, onRemoveTicker }: QuoteRowProps) {
  const { data: quote, isLoading: isQuoteLoading } = useQuote(symbol);
  const { data: profile, isLoading: isProfileLoading } = useProfile(symbol);

  // Only show loading state for quote data since it's essential
  if (isQuoteLoading) {
    return <LoadingRow />;
  }

  if (!quote) return null;

  return (
    <TableRow key={`${symbol}-${watchlistId}`} className={cn(
      "group",
      "even:bg-muted/40"
    )}>
      <TableCell className={cn(
        "sticky left-0"    
      )}>
        <div className="flex items-center gap-2">
          <Link 
            href={`/search/${symbol}`}
            className="hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm"
          >
            {symbol}
          </Link>
        </div>
      </TableCell>
      <TableCell className="text-xs sm:text-sm">${formatNumber(quote.price)}</TableCell>
      <TableCell>
        <span className={cn(
          "text-xs sm:text-sm",
          quote.change >= 0 ? "text-positive" : "text-negative"
        )}>
          {quote.change >= 0 ? '+' : '-'}{formatNumber(Math.abs(quote.change))}
        </span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "text-xs sm:text-sm",
          quote.changesPercentage >= 0 ? "text-positive" : "text-negative"
          )}>
          {quote.changesPercentage >= 0 ? '+' : ''}{formatPercentage(quote.changesPercentage)}
        </span>
      </TableCell>
      <TableCell className="text-xs sm:text-sm">{formatNumber(quote.volume)}</TableCell>
      <TableCell>
        <PriceChangeCell symbol={symbol} period="1Y" />
      </TableCell>
      <TableCell>
        <PriceChangeCell symbol={symbol} period="3Y" />
      </TableCell>
      <TableCell>
        <PriceChangeCell symbol={symbol} period="5Y" />
      </TableCell>
      <TableCell className="text-xs sm:text-sm">{formatMarketCap(quote.marketCap)}</TableCell>
      <TableCell className="text-xs sm:text-sm">
        {isProfileLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : profile?.sector ? (
          <Link 
            href={`/scans/sectors/${encodeURIComponent(profile.sector)}`}
            className="hover:underline text-blue-600 dark:text-blue-400"
          >
            {profile.sector}
          </Link>
        ) : "-"}
      </TableCell>
      <TableCell className="text-xs sm:text-sm">
        {isProfileLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : profile?.sector && profile?.industry ? (
          <Link 
            href={`/scans/sectors/${encodeURIComponent(profile.sector)}/industry/${encodeURIComponent(profile.industry)}`}
            className="hover:underline text-blue-600 dark:text-blue-400"
          >
            {profile.industry}
          </Link>
        ) : "-"}
      </TableCell>
      <TableCell className="text-xs sm:text-sm">{formatEarningsDate(quote.earningsAnnouncement)}</TableCell>
      <TableCell className="text-xs sm:text-sm">
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

async function fetchPriceChanges(symbol: string): Promise<{
  oneYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
  threeYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
  fiveYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
}> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const today = getTodayDate();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearsAgoStr = fiveYearsAgo.toISOString().split('T')[0];

  const response = await fetch(`/api/fmp/dailyprices?symbol=${symbol}&from=${fiveYearsAgoStr}&to=${today}`);

  if (!response.ok) {
    throw new Error('Failed to fetch price changes data');
  }

  const data = await response.json();
  return data;
}

function ExportButton({ watchlist }: ExportButtonProps) {
  // Use the same query keys as the main hooks to share cache
  const quoteResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['quote', ticker.symbol],
      queryFn: () => fetchQuote(ticker.symbol),
      select: (data: Ticker[]) => data[0],
      enabled: Boolean(ticker.symbol),
      staleTime: Infinity,
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

  const priceChangeResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['price-changes', ticker.symbol, getTodayDate()],
      queryFn: () => fetchPriceChanges(ticker.symbol),
      enabled: Boolean(ticker.symbol),
      staleTime: Infinity,
      refetchInterval: 0,
    }))
  });

  const handleExport = () => {
    // Create CSV header
    const headers = ['Symbol', 'Price', 'Change ($)', 'Change (%)', 'Volume', '1Y Change (%)', '3Y Change (%)', '5Y Change (%)', 'Market Cap', 'Sector', 'Industry', 'Next Earnings'];
    const csvRows = [headers.map(header => `"${header}"`)];

    // Use the data that's already loaded
    watchlist.tickers.forEach((ticker, index) => {
      const quote = quoteResults[index].data;
      const profile = profileResults[index].data;
      const priceChanges = priceChangeResults[index].data;

      const formatPriceChange = (change: { changePercent: number } | null | undefined) => {
        if (!change) return '""';
        return `"${change.changePercent >= 0 ? '+' : ''}${formatPercentage(change.changePercent)}"`;
      };

      const row = [
        `"${ticker.symbol}"`,
        quote ? `"$${formatNumber(quote.price)}"` : '""',
        quote ? `"${quote.change >= 0 ? '+' : '-'}${formatNumber(Math.abs(quote.change))}"` : '""',
        quote ? `"${quote.changesPercentage >= 0 ? '+' : ''}${formatPercentage(quote.changesPercentage)}"` : '""',
        quote ? `"${formatNumber(quote.volume)}"` : '""',
        formatPriceChange(priceChanges?.oneYear),
        formatPriceChange(priceChanges?.threeYear),
        formatPriceChange(priceChanges?.fiveYear),
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

interface WatchlistHeaderProps {
  watchlist: WatchlistCard;
  editNameInput: string;
  onEditNameChange: (value: string) => void;
  onSaveWatchlistName: () => void;
  onToggleEditMode: () => void;
  newTickerInput: string;
  onNewTickerChange: (value: string) => void;
  onAddTicker: () => void;
  onKeyPress: (e: React.KeyboardEvent, action: () => void) => void;
  onRemoveWatchlist: (watchlistId: string) => void;
}

interface WatchlistTableProps {
  watchlist: WatchlistCard;
  onRemoveTicker: (watchlistId: string, ticker: string) => void;
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

// Header component that contains watchlist name and add ticker controls
function WatchlistHeader({
  watchlist,
  editNameInput,
  onEditNameChange,
  onSaveWatchlistName,
  onToggleEditMode,
  newTickerInput,
  onNewTickerChange,
  onAddTicker,
  onKeyPress,
  onRemoveWatchlist,
}: WatchlistHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  return (
    <>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={onToggleEditMode}
                      className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                    >
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Name</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete Watchlist</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Watchlist</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete watchlist &quot;{watchlist.name}&quot;? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDeleteDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        onRemoveWatchlist(watchlist.id);
                        setShowDeleteDialog(false);
                      }}
                    >
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="sm:px-6 px-3 pb-3">
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

      </CardContent>
    </>
  );
}

// Table component that re-renders when watchlist data changes
function WatchlistTable({ watchlist, onRemoveTicker }: WatchlistTableProps) {
  return (
    <CardContent className="sm:px-6 px-3 pt-0">
      <SortableContext
        items={watchlist.tickers.map(t => `${t.symbol}-${watchlist.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="rounded-md border border-border overflow-x-auto w-full">
          <Table className="w-full">
                          <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 bg-background/95 text-xs whitespace-nowrap">Symbol</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Price</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Change ($)</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Change (%)</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Volume</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">1Y Change</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">3Y Change</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">5Y Change</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Market Cap</TableHead> 
                  <TableHead className="text-xs whitespace-nowrap">Sector</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Industry</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Next Earnings</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {watchlist.tickers.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={13} 
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
    </CardContent>
  );
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
    <Card className="border-0 shadow-none w-full">
      <WatchlistHeader
        watchlist={watchlist}
        editNameInput={editNameInput}
        onEditNameChange={onEditNameChange}
        onSaveWatchlistName={onSaveWatchlistName}
        onToggleEditMode={onToggleEditMode}
        newTickerInput={newTickerInput}
        onNewTickerChange={onNewTickerChange}
        onAddTicker={onAddTicker}
        onKeyPress={onKeyPress}
        onRemoveWatchlist={onRemoveWatchlist}
      />
      <WatchlistTable
        key={`table-${watchlist.id}-${watchlist.tickers.length}`} // Only re-render when tickers change
        watchlist={watchlist}
        onRemoveTicker={onRemoveTicker}
      />
    </Card>
  );
} 