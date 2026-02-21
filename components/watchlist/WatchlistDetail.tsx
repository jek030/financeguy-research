import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Check, Pencil, Download, Plus, InfoIcon } from 'lucide-react';
import { WatchlistCard } from './types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatNumber, formatPercentage } from '@/lib/utils';
import { safeFormat } from '@/lib/formatters';
import { X, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useQueries } from '@tanstack/react-query';
import type { Ticker, CompanyProfile, StockDividend } from '@/lib/types';
import { formatMarketCap } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { useSortableTable } from '@/hooks/useSortableTable';

// Helper function to get today's date
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper function to calculate business days ago
function getBusinessDateAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  
  // If it's a weekend, move to previous Friday
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) { // Sunday
    date.setDate(date.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0];
}

// Helper function to find the closest available price data
function findClosestPrice(historical: Array<{ date: string; close: number }>, targetDate: string): { date: string; close: number } | null {
  if (!historical || historical.length === 0) return null;
  
  const target = new Date(targetDate);
  let closest = historical[0];
  let minDiff = Math.abs(new Date(closest.date).getTime() - target.getTime());
  
  for (const price of historical) {
    const diff = Math.abs(new Date(price.date).getTime() - target.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = price;
    }
  }
  
  return closest;
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

// Calculate Daily Closing Range: (Close - Low) / (High - Low) * 100
function calculateDCR(price: number, dayLow: number, dayHigh: number): number | null {
  const range = dayHigh - dayLow;
  if (range === 0) return null;
  return ((price - dayLow) / range) * 100;
}

// Price change data type for table-level fetching
type PriceChangePeriodData = {
  changePercent: number;
  currentPrice: number;
  historicalPrice: number;
  currentDate: string;
  historicalDate: string;
};

type PriceChangesData = {
  oneYear?: PriceChangePeriodData;
  threeYear?: PriceChangePeriodData;
  fiveYear?: PriceChangePeriodData;
  avgVolume20D?: number;
};

// Helper component for price change cells with tooltips (data-driven)
interface PriceChangeCellProps {
  periodData?: PriceChangePeriodData | null;
  period: '1Y' | '3Y' | '5Y';
  isLoading: boolean;
}

function PriceChangeCell({ periodData, period, isLoading }: PriceChangeCellProps) {
  if (isLoading) {
    return <Skeleton className="h-4 w-16" />;
  }

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
  quote?: Ticker;
  isQuoteLoading: boolean;
  profile?: CompanyProfile;
  isProfileLoading: boolean;
  dividendYield?: number | null;
  isDividendLoading: boolean;
  priceChanges?: PriceChangesData;
  isPriceChangesLoading: boolean;
  isSortActive: boolean;
  volumeRunRate?: number | null;
  isVolumeRunRateLoading: boolean;
}

function LoadingRow({ isSortActive }: { isSortActive?: boolean }) {
  return (
    <TableRow>
      <TableCell className="sticky left-0 z-20 !bg-background px-0 border-r border-border">
        <div className={cn("grid items-center", isSortActive ? "grid-cols-[auto]" : "grid-cols-[40px,auto]")}>
          {!isSortActive && (
            <div className="w-10 flex items-center justify-center">
              <Skeleton className="h-4 w-4" />
            </div>
          )}
          <div className="px-2">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </TableCell>
      {Array(17).fill(0).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-16" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function QuoteRow({
  symbol,
  watchlistId,
  onRemoveTicker,
  quote,
  isQuoteLoading,
  profile,
  isProfileLoading,
  dividendYield,
  isDividendLoading,
  priceChanges,
  isPriceChangesLoading,
  isSortActive,
  volumeRunRate,
  isVolumeRunRateLoading,
}: QuoteRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${symbol}-${watchlistId}`,
    data: {
      type: 'ticker',
      ticker: { symbol, watchlistId },
    },
    disabled: isSortActive,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Only show loading state for quote data since it's essential
  if (isQuoteLoading) {
    return <LoadingRow isSortActive={isSortActive} />;
  }

  if (!quote) return null;

  return (
    <TableRow 
      ref={setNodeRef}
      style={style}
      key={`${symbol}-${watchlistId}`} 
      className={cn(
        "group",
        "even:bg-muted/40",
        isDragging && "opacity-50 bg-muted/80"
      )}
    >
      <TableCell className="sticky left-0 z-20 !bg-background px-0 border-r border-border">
        <div className={cn("grid items-center", isSortActive ? "grid-cols-[auto]" : "grid-cols-[40px,auto]")}>
          {!isSortActive && (
            <div 
              {...attributes} 
              {...listeners} 
              className="w-10 cursor-grab hover:text-foreground text-muted-foreground/50 flex items-center justify-center"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          <div className="flex items-center gap-2 px-2">
            <Link 
              href={`/search/${symbol}`}
              className="hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold"
            >
              {symbol}
            </Link>
          </div>
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
      <TableCell className="text-xs sm:text-sm">
        {isPriceChangesLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : priceChanges?.avgVolume20D ? (
          formatNumber(priceChanges.avgVolume20D)
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-xs sm:text-sm">
        {isVolumeRunRateLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : volumeRunRate !== null && volumeRunRate !== undefined ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn(
                  "cursor-help",
                  volumeRunRate >= 150 ? "text-positive font-semibold" :
                  volumeRunRate >= 100 ? "text-positive" :
                  volumeRunRate <= 50 ? "text-destructive" :
                  "text-foreground"
                )}>
                  {volumeRunRate.toFixed(0)}%
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={5}>
                <div className="space-y-1">
                  <p>Today&apos;s Vol: {formatNumber(quote.volume)}</p>
                  <p>20D Avg Vol: {formatNumber(priceChanges?.avgVolume20D ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {volumeRunRate >= 150 ? 'Unusually high volume' :
                     volumeRunRate >= 100 ? 'Above average volume' :
                     volumeRunRate <= 50 ? 'Unusually low volume' :
                     'Below average volume'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        <PriceChangeCell periodData={priceChanges?.oneYear} period="1Y" isLoading={isPriceChangesLoading} />
      </TableCell>
      <TableCell>
        <PriceChangeCell periodData={priceChanges?.threeYear} period="3Y" isLoading={isPriceChangesLoading} />
      </TableCell>
      <TableCell>
        <PriceChangeCell periodData={priceChanges?.fiveYear} period="5Y" isLoading={isPriceChangesLoading} />
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
      <TableCell className="text-xs sm:text-sm">
        {quote.pe ? safeFormat(quote.pe) : 'N/A'}
      </TableCell>
      <TableCell className="text-xs sm:text-sm">
        {isDividendLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : dividendYield !== null && dividendYield !== undefined ? (
          `${dividendYield.toFixed(2)}%`
        ) : '-'}
      </TableCell>
      <TableCell className="text-xs sm:text-sm">
        {(() => {
          const dcr = calculateDCR(quote.price, quote.dayLow, quote.dayHigh);
          if (dcr === null) return <span className="text-muted-foreground">-</span>;
          return (
            <span className={cn(
              dcr >= 70 ? "text-positive" : dcr <= 30 ? "text-destructive" : "text-foreground"
            )}>
              {dcr.toFixed()}%
            </span>
          );
        })()}
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
  avgVolume20D?: number;
}> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const today = getTodayDate();
  const fiveYearsAgo = getBusinessDateAgo(5);

  const response = await fetch(`/api/fmp/dailyprices?symbol=${symbol}&from=${fiveYearsAgo}&to=${today}`);

  if (!response.ok) {
    throw new Error('Failed to fetch price changes data');
  }

  const data = await response.json();
  const historical = data.historical;

  if (!historical || historical.length === 0) {
    return {
      oneYear: undefined,
      threeYear: undefined,
      fiveYear: undefined
    };
  }

  // Sort by date descending (most recent first)
  const sortedHistorical = historical.sort((a: { date: string }, b: { date: string }) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get current price (most recent available)
  const currentData = sortedHistorical[0];
  
  // Calculate target dates
  const oneYearAgo = getBusinessDateAgo(1);
  const threeYearsAgo = getBusinessDateAgo(3);
  const fiveYearsAgoTarget = getBusinessDateAgo(5);
  
  // Find closest prices for each period
  const oneYearData = findClosestPrice(sortedHistorical, oneYearAgo);
  const threeYearData = findClosestPrice(sortedHistorical, threeYearsAgo);
  const fiveYearData = findClosestPrice(sortedHistorical, fiveYearsAgoTarget);
  
  // Calculate percentage changes
  const createPriceChangeData = (
    historicalData: typeof currentData | null
  ) => {
    if (!historicalData || !currentData) return undefined;
    
    const changePercent = ((currentData.close - historicalData.close) / historicalData.close) * 100;
    
    return {
      changePercent,
      currentPrice: currentData.close,
      historicalPrice: historicalData.close,
      currentDate: currentData.date,
      historicalDate: historicalData.date,
    };
  };

  // Calculate 20-day average volume: mean of the last 20 completed trading days (exclude today if present)
  const todayStr = getTodayDate();
  const completedDays = sortedHistorical.filter((d: { date: string }) => d.date < todayStr);
  const last20TradingDays = completedDays.slice(0, 20);
  const avgVolume20D = last20TradingDays.length === 20
    ? last20TradingDays.reduce((sum: number, d: { volume: number }) => sum + d.volume, 0) / 20
    : undefined;

  return {
    oneYear: createPriceChangeData(oneYearData),
    threeYear: createPriceChangeData(threeYearData),
    fiveYear: createPriceChangeData(fiveYearData),
    avgVolume20D,
  };
}

async function fetchDividendYield(symbol: string): Promise<number | null> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/dividendhistory?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dividend data');
  }

  const jsonData: StockDividend[] = await response.json();
  
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    return jsonData[0].yield;
  }
  
  return null;
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
    const headers = ['Symbol', 'Price', 'Change ($)', 'Change (%)', 'Volume', 'Avg Vol 20D', 'Vol Run Rate (%)', '1Y Change (%)', '3Y Change (%)', '5Y Change (%)', 'Market Cap', 'Sector', 'Industry', 'P/E Ratio', 'Dividend Yield (%)', 'DCR (%)', 'Next Earnings'];
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

      const avgVol20D = priceChanges?.avgVolume20D;
      const volRunRate = (quote?.volume && avgVol20D && avgVol20D > 0)
        ? (quote.volume / avgVol20D) * 100
        : null;

      const row = [
        `"${ticker.symbol}"`,
        quote ? `"$${formatNumber(quote.price)}"` : '""',
        quote ? `"${quote.change >= 0 ? '+' : '-'}${formatNumber(Math.abs(quote.change))}"` : '""',
        quote ? `"${quote.changesPercentage >= 0 ? '+' : ''}${formatPercentage(quote.changesPercentage)}"` : '""',
        quote ? `"${formatNumber(quote.volume)}"` : '""',
        priceChanges?.avgVolume20D ? `"${formatNumber(priceChanges.avgVolume20D)}"` : '""',
        volRunRate !== null ? `"${volRunRate.toFixed(0)}%"` : '""',
        formatPriceChange(priceChanges?.oneYear),
        formatPriceChange(priceChanges?.threeYear),
        formatPriceChange(priceChanges?.fiveYear),
        quote ? `"${formatMarketCap(quote.marketCap)}"` : '""',
        profile && profile.sector ? `"${profile.sector}"` : '""',
        profile && profile.industry ? `"${profile.industry}"` : '""',
        quote && quote.pe ? `"${safeFormat(quote.pe)}"` : '""',
        '""', // Dividend yield - not loaded in export
        quote ? (() => {
          const dcr = calculateDCR(quote.price, quote.dayLow, quote.dayHigh);
          return dcr !== null ? `"${dcr.toFixed(1)}%"` : '""';
        })() : '""',
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete Watchlist</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
  const { sortColumn, sortDirection, handleSort } = useSortableTable();
  const isSortActive = sortColumn !== null;

  // Batch fetch all quotes
  const quoteResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['quote', ticker.symbol],
      queryFn: () => fetchQuote(ticker.symbol),
      select: (data: Ticker[]) => data[0],
      enabled: Boolean(ticker.symbol),
      refetchInterval: 60000,
      staleTime: 30000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      retryDelay: 3000,
    }))
  });

  // Batch fetch all profiles
  const profileResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['profile', ticker.symbol, getTodayDate()],
      queryFn: () => fetchProfile(ticker.symbol),
      select: (data: CompanyProfile[]) => data[0],
      enabled: Boolean(ticker.symbol),
      staleTime: Infinity,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      retryDelay: 5000,
    }))
  });

  // Batch fetch all dividend yields
  const dividendResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['dividend-yield', ticker.symbol],
      queryFn: () => fetchDividendYield(ticker.symbol),
      enabled: Boolean(ticker.symbol),
      staleTime: 1000 * 60 * 60 * 24,
    }))
  });

  // Batch fetch all price changes
  const priceChangeResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['price-changes', ticker.symbol],
      queryFn: () => fetchPriceChanges(ticker.symbol),
      enabled: Boolean(ticker.symbol),
      staleTime: 24 * 60 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }))
  });

  // Build a data lookup map by symbol
  const tickerDataMap = useMemo(() => {
    const map = new Map<string, {
      quote?: Ticker;
      isQuoteLoading: boolean;
      profile?: CompanyProfile;
      isProfileLoading: boolean;
      dividendYield?: number | null;
      isDividendLoading: boolean;
      priceChanges?: PriceChangesData;
      isPriceChangesLoading: boolean;
      volumeRunRate?: number | null;
      isVolumeRunRateLoading: boolean;
    }>();

    watchlist.tickers.forEach((ticker, i) => {
      const quote = quoteResults[i]?.data;
      const priceChanges = priceChangeResults[i]?.data as PriceChangesData | undefined;
      const avgVol20D = priceChanges?.avgVolume20D;

      const volumeRunRate = (quote?.volume && avgVol20D && avgVol20D > 0)
        ? (quote.volume / avgVol20D) * 100
        : null;

      map.set(ticker.symbol, {
        quote,
        isQuoteLoading: quoteResults[i]?.isLoading ?? true,
        profile: profileResults[i]?.data,
        isProfileLoading: profileResults[i]?.isLoading ?? true,
        dividendYield: dividendResults[i]?.data,
        isDividendLoading: dividendResults[i]?.isLoading ?? true,
        priceChanges,
        isPriceChangesLoading: priceChangeResults[i]?.isLoading ?? true,
        volumeRunRate,
        isVolumeRunRateLoading: (quoteResults[i]?.isLoading ?? true) || (priceChangeResults[i]?.isLoading ?? true),
      });
    });

    return map;
  }, [watchlist.tickers, quoteResults, profileResults, dividendResults, priceChangeResults]);

  // Sort tickers based on current sort state
  const sortedTickers = useMemo(() => {
    if (!sortColumn) return watchlist.tickers;

    return [...watchlist.tickers].sort((a, b) => {
      const aData = tickerDataMap.get(a.symbol);
      const bData = tickerDataMap.get(b.symbol);
      const aQuote = aData?.quote;
      const bQuote = bData?.quote;

      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortColumn) {
        case 'symbol':
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case 'price':
          aVal = aQuote?.price ?? 0;
          bVal = bQuote?.price ?? 0;
          break;
        case 'change':
          aVal = aQuote?.change ?? 0;
          bVal = bQuote?.change ?? 0;
          break;
        case 'changePercent':
          aVal = aQuote?.changesPercentage ?? 0;
          bVal = bQuote?.changesPercentage ?? 0;
          break;
        case 'volume':
          aVal = aQuote?.volume ?? 0;
          bVal = bQuote?.volume ?? 0;
          break;
        case 'avgVol20D':
          aVal = aData?.priceChanges?.avgVolume20D ?? -Infinity;
          bVal = bData?.priceChanges?.avgVolume20D ?? -Infinity;
          break;
        case 'volRunRate':
          aVal = aData?.volumeRunRate ?? -Infinity;
          bVal = bData?.volumeRunRate ?? -Infinity;
          break;
        case '1yChange':
          aVal = aData?.priceChanges?.oneYear?.changePercent ?? -Infinity;
          bVal = bData?.priceChanges?.oneYear?.changePercent ?? -Infinity;
          break;
        case '3yChange':
          aVal = aData?.priceChanges?.threeYear?.changePercent ?? -Infinity;
          bVal = bData?.priceChanges?.threeYear?.changePercent ?? -Infinity;
          break;
        case '5yChange':
          aVal = aData?.priceChanges?.fiveYear?.changePercent ?? -Infinity;
          bVal = bData?.priceChanges?.fiveYear?.changePercent ?? -Infinity;
          break;
        case 'marketCap':
          aVal = aQuote?.marketCap ?? 0;
          bVal = bQuote?.marketCap ?? 0;
          break;
        case 'sector':
          aVal = aData?.profile?.sector ?? '';
          bVal = bData?.profile?.sector ?? '';
          break;
        case 'industry':
          aVal = aData?.profile?.industry ?? '';
          bVal = bData?.profile?.industry ?? '';
          break;
        case 'peRatio':
          aVal = aQuote?.pe ?? -Infinity;
          bVal = bQuote?.pe ?? -Infinity;
          break;
        case 'divYield':
          aVal = aData?.dividendYield ?? -Infinity;
          bVal = bData?.dividendYield ?? -Infinity;
          break;
        case 'dcr': {
          const aDcr = aQuote ? calculateDCR(aQuote.price, aQuote.dayLow, aQuote.dayHigh) : null;
          const bDcr = bQuote ? calculateDCR(bQuote.price, bQuote.dayLow, bQuote.dayHigh) : null;
          aVal = aDcr ?? -Infinity;
          bVal = bDcr ?? -Infinity;
          break;
        }
        case 'earnings': {
          aVal = aQuote?.earningsAnnouncement ? new Date(aQuote.earningsAnnouncement).getTime() : 0;
          bVal = bQuote?.earningsAnnouncement ? new Date(bQuote.earningsAnnouncement).getTime() : 0;
          break;
        }
        default:
          return 0;
      }

      // String comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      // Numeric comparison
      const aNum = typeof aVal === 'number' ? aVal : Number(aVal);
      const bNum = typeof bVal === 'number' ? bVal : Number(bVal);
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [watchlist.tickers, sortColumn, sortDirection, tickerDataMap]);

  return (
    <CardContent className="sm:px-6 px-3 pt-0">
      <SortableContext
        items={sortedTickers.map(t => `${t.symbol}-${watchlist.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <SortableHeader
                    column="symbol"
                    label={
                      <div className={cn("flex items-center whitespace-nowrap", !isSortActive && "pl-10")}>
                        Symbol
                      </div>
                    }
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="sticky left-0 z-20 !bg-background border-r border-border"
                  />
                  <SortableHeader column="price" label="Price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="change" label="Change ($)" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="changePercent" label="Change (%)" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="volume" label="Volume" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader
                    column="avgVol20D"
                    label={
                      <span className="flex items-center gap-1">
                        Avg Vol 20D
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                <InfoIcon className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={5}>
                              <p>Average volume over the last 20 completed trading days</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    }
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="border-r"
                  />
                  <SortableHeader
                    column="volRunRate"
                    label={
                      <span className="flex items-center gap-1">
                        Vol RR
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                <InfoIcon className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={5}>
                              <p>Volume Run Rate: Today&apos;s Volume / 20D Avg Volume × 100</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    }
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="border-r"
                  />
                  <SortableHeader column="1yChange" label="1Y Change" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="3yChange" label="3Y Change" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="5yChange" label="5Y Change" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="marketCap" label="Market Cap" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="sector" label="Sector" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="industry" label="Industry" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="peRatio" label="P/E Ratio" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader column="divYield" label="Div. Yield" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <SortableHeader
                    column="dcr"
                    label={
                      <span className="flex items-center gap-1">
                        DCR
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                <InfoIcon className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={5}>
                              <p>Daily Closing Range: (Close - Low) / (High - Low) × 100</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </span>
                    }
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="border-r"
                  />
                  <SortableHeader column="earnings" label="Next Earnings" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r" />
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={19} 
                      className="h-12 sm:h-12 text-center text-xs sm:text-sm text-muted-foreground"
                    >
                      No tickers added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTickers.map((ticker) => {
                    const data = tickerDataMap.get(ticker.symbol);
                    return (
                      <QuoteRow
                        key={`${ticker.symbol}-${watchlist.id}`}
                        symbol={ticker.symbol}
                        watchlistId={watchlist.id}
                        onRemoveTicker={onRemoveTicker}
                        quote={data?.quote}
                        isQuoteLoading={data?.isQuoteLoading ?? true}
                        profile={data?.profile}
                        isProfileLoading={data?.isProfileLoading ?? true}
                        dividendYield={data?.dividendYield}
                        isDividendLoading={data?.isDividendLoading ?? true}
                        priceChanges={data?.priceChanges}
                        isPriceChangesLoading={data?.isPriceChangesLoading ?? true}
                        isSortActive={isSortActive}
                        volumeRunRate={data?.volumeRunRate}
                        isVolumeRunRateLoading={data?.isVolumeRunRateLoading ?? true}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
        key={`table-${watchlist.id}-${watchlist.tickers.map(t => t.symbol).join(',')}`} // Re-render when tickers or their order change
        watchlist={watchlist}
        onRemoveTicker={onRemoveTicker}
      />
    </Card>
  );
} 