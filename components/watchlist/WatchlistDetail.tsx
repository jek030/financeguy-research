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
import { ColumnSettingsPopover } from '@/components/ui/ColumnSettingsPopover';
import type { TableColumnDef } from '@/lib/table-types';

// ---------------------------------------------------------------------------
// Column definitions for the watchlist table
// ---------------------------------------------------------------------------

const WATCHLIST_COLUMNS: TableColumnDef[] = [
  { id: 'symbol', label: 'Symbol', isAnchor: true },
  { id: 'price', label: 'Price' },
  { id: 'change', label: 'Change ($)' },
  { id: 'changePercent', label: 'Change (%)' },
  { id: 'volume', label: 'Volume' },
  { id: 'avgVol20D', label: 'Avg Vol 20D', tooltip: 'Average volume over the last 20 completed trading days' },
  { id: 'volRunRate', label: 'Vol RR', tooltip: "Volume Run Rate: Today's Volume / 20D Avg Volume × 100" },
  { id: '1yChange', label: '1Y Change' },
  { id: '3yChange', label: '3Y Change', defaultHidden: true },
  { id: '5yChange', label: '5Y Change', defaultHidden: true },
  { id: 'marketCap', label: 'Market Cap' },
  { id: 'sector', label: 'Sector' },
  { id: 'industry', label: 'Industry' },
  { id: 'peRatio', label: 'P/E Ratio' },
  { id: 'divYield', label: 'Div. Yield' },
  { id: 'dcr', label: 'DCR', tooltip: 'Daily Closing Range: (Close - Low) / (High - Low) × 100' },
  { id: 'earnings', label: 'Next Earnings' },
  { id: 'actions', label: 'Actions', alwaysVisible: true, sortable: false },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getBusinessDateAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) date.setDate(date.getDate() - 2);
  else if (dayOfWeek === 6) date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

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

function formatEarningsDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

function calculateDCR(price: number, dayLow: number, dayHigh: number): number | null {
  const range = dayHigh - dayLow;
  if (range === 0) return null;
  return ((price - dayLow) / range) * 100;
}

type SortValue = number | string | null | undefined;

function compareSortValues(aVal: SortValue, bVal: SortValue, direction: 'asc' | 'desc') {
  const aMissing = aVal === null || aVal === undefined || aVal === '';
  const bMissing = bVal === null || bVal === undefined || bVal === '';

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof aVal === 'string' && typeof bVal === 'string') {
    const result = aVal.localeCompare(bVal);
    return direction === 'asc' ? result : -result;
  }

  const aNum = typeof aVal === 'number' ? aVal : Number(aVal);
  const bNum = typeof bVal === 'number' ? bVal : Number(bVal);

  if (Number.isNaN(aNum) && Number.isNaN(bNum)) return 0;
  if (Number.isNaN(aNum)) return 1;
  if (Number.isNaN(bNum)) return -1;

  return direction === 'asc' ? aNum - bNum : bNum - aNum;
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Cell renderers
// ---------------------------------------------------------------------------

function PriceChangeCell({ periodData, period, isLoading }: { periodData?: PriceChangePeriodData | null; period: '1Y' | '3Y' | '5Y'; isLoading: boolean }) {
  if (isLoading) return <Skeleton className="h-4 w-16" />;
  if (!periodData) return <span className="text-muted-foreground">-</span>;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help text-xs sm:text-sm", periodData.changePercent >= 0 ? "text-positive" : "text-destructive")}>
            {periodData.changePercent >= 0 ? '+' : ''}{formatPercentage(periodData.changePercent)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={5}>
          <div className="space-y-1">
            <p>Current: ${formatNumber(periodData.currentPrice)} ({fmtDate(periodData.currentDate)})</p>
            <p>{period} Ago: ${formatNumber(periodData.historicalPrice)} ({fmtDate(periodData.historicalDate)})</p>
            <p className="text-xs text-muted-foreground mt-1">
              {periodData.changePercent >= 0 ? 'Gain' : 'Loss'} of {formatPercentage(Math.abs(periodData.changePercent))} over {period.toLowerCase()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Data row types
// ---------------------------------------------------------------------------

interface TickerRowData {
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
}

// ---------------------------------------------------------------------------
// Cell renderer map — returns JSX for a given column id
// ---------------------------------------------------------------------------

function renderCell(
  colId: string,
  data: TickerRowData,
  symbol: string,
  watchlistId: string,
  onRemoveTicker: (wId: string, sym: string) => void,
): React.ReactNode {
  const { quote, profile, isProfileLoading, dividendYield, isDividendLoading, priceChanges, isPriceChangesLoading, volumeRunRate, isVolumeRunRateLoading } = data;
  if (!quote) return null;

  switch (colId) {
    case 'price':
      return <span className="text-xs sm:text-sm">${formatNumber(quote.price)}</span>;

    case 'change':
      return (
        <span className={cn("text-xs sm:text-sm", quote.change >= 0 ? "text-positive" : "text-negative")}>
          {quote.change >= 0 ? '+' : '-'}{formatNumber(Math.abs(quote.change))}
        </span>
      );

    case 'changePercent':
      return (
        <span className={cn("text-xs sm:text-sm", quote.changesPercentage >= 0 ? "text-positive" : "text-negative")}>
          {quote.changesPercentage >= 0 ? '+' : ''}{formatPercentage(quote.changesPercentage)}
        </span>
      );

    case 'volume':
      return <span className="text-xs sm:text-sm">{formatNumber(quote.volume)}</span>;

    case 'avgVol20D':
      if (isPriceChangesLoading) return <Skeleton className="h-4 w-16" />;
      return priceChanges?.avgVolume20D
        ? <span className="text-xs sm:text-sm">{formatNumber(Math.round(priceChanges.avgVolume20D))}</span>
        : <span className="text-muted-foreground">-</span>;

    case 'volRunRate':
      if (isVolumeRunRateLoading) return <Skeleton className="h-4 w-16" />;
      if (volumeRunRate === null || volumeRunRate === undefined) return <span className="text-muted-foreground">-</span>;
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn(
                "cursor-help text-xs sm:text-sm",
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
                <p>20D Avg Vol: {formatNumber(Math.round(priceChanges?.avgVolume20D ?? 0))}</p>
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
      );

    case '1yChange':
      return <PriceChangeCell periodData={priceChanges?.oneYear} period="1Y" isLoading={isPriceChangesLoading} />;
    case '3yChange':
      return <PriceChangeCell periodData={priceChanges?.threeYear} period="3Y" isLoading={isPriceChangesLoading} />;
    case '5yChange':
      return <PriceChangeCell periodData={priceChanges?.fiveYear} period="5Y" isLoading={isPriceChangesLoading} />;

    case 'marketCap':
      return <span className="text-xs sm:text-sm">{formatMarketCap(quote.marketCap)}</span>;

    case 'sector':
      if (isProfileLoading) return <Skeleton className="h-4 w-16" />;
      return profile?.sector ? (
        <Link href={`/screener/sectors/${encodeURIComponent(profile.sector)}`} className="hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm">{profile.sector}</Link>
      ) : <span className="text-xs sm:text-sm">-</span>;

    case 'industry':
      if (isProfileLoading) return <Skeleton className="h-4 w-16" />;
      return profile?.sector && profile?.industry ? (
        <Link href={`/screener/sectors/${encodeURIComponent(profile.sector)}/industry/${encodeURIComponent(profile.industry)}`} className="hover:underline text-blue-600 dark:text-blue-400 text-xs sm:text-sm">{profile.industry}</Link>
      ) : <span className="text-xs sm:text-sm">-</span>;

    case 'peRatio':
      return <span className="text-xs sm:text-sm">{quote.pe ? safeFormat(quote.pe) : 'N/A'}</span>;

    case 'divYield':
      if (isDividendLoading) return <Skeleton className="h-4 w-16" />;
      return <span className="text-xs sm:text-sm">{dividendYield !== null && dividendYield !== undefined ? `${dividendYield.toFixed(2)}%` : '-'}</span>;

    case 'dcr': {
      const dcr = calculateDCR(quote.price, quote.dayLow, quote.dayHigh);
      if (dcr === null) return <span className="text-muted-foreground">-</span>;
      return (
        <span className={cn("text-xs sm:text-sm", dcr >= 70 ? "text-positive" : dcr <= 30 ? "text-destructive" : "text-foreground")}>
          {dcr.toFixed()}%
        </span>
      );
    }

    case 'earnings':
      return <span className="text-xs sm:text-sm">{formatEarningsDate(quote.earningsAnnouncement)}</span>;

    case 'actions':
      return (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemoveTicker(watchlistId, symbol)}
          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 sm:h-7 sm:w-7"
        >
          <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Loading row
// ---------------------------------------------------------------------------

function LoadingRow({ visibleCount }: { visibleCount: number }) {
  return (
    <TableRow className="h-9 border-b border-border/60">
      <TableCell className="sticky left-0 z-20 !bg-background px-0 border-r border-border/60">
        <div className="grid grid-cols-[40px,auto] items-center">
          <div className="w-10 flex items-center justify-center">
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="px-2">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </TableCell>
      {Array(visibleCount - 1).fill(0).map((_, i) => (
        <TableCell key={i} className="h-9 py-1.5">
          <Skeleton className="h-4 w-16" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// QuoteRow
// ---------------------------------------------------------------------------

interface QuoteRowProps {
  symbol: string;
  watchlistId: string;
  onRemoveTicker: (watchlistId: string, symbol: string) => void;
  data: TickerRowData;
  isSortActive: boolean;
  enableRowReorder: boolean;
  visibleColumns: TableColumnDef[];
}

function QuoteRow({ symbol, watchlistId, onRemoveTicker, data, isSortActive, enableRowReorder, visibleColumns }: QuoteRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${symbol}-${watchlistId}`,
    data: { type: 'ticker', ticker: { symbol, watchlistId } },
    disabled: isSortActive || !enableRowReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (data.isQuoteLoading) {
    return <LoadingRow visibleCount={visibleColumns.length} />;
  }

  if (!data.quote) return null;

  const showDragHandle = enableRowReorder;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn("group h-9 border-b border-border/60 transition-colors hover:bg-muted/35", "even:bg-muted/20", isDragging && "opacity-50 bg-muted/80")}
    >
      {visibleColumns.map(col => {
        if (col.isAnchor) {
          return (
            <TableCell key={col.id} className="sticky left-0 z-20 !bg-background px-0 border-r border-border/60">
              <div className={cn("grid items-center", showDragHandle ? "grid-cols-[40px,auto]" : "grid-cols-[auto]")}>
                {showDragHandle && (
                  <div
                    {...attributes}
                    {...listeners}
                    className={cn(
                      "w-10 flex items-center justify-center text-muted-foreground/50",
                      isSortActive ? "cursor-default" : "cursor-grab hover:text-foreground"
                    )}
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
          );
        }

        return (
          <TableCell key={col.id} className={cn("h-9 py-1.5", col.id === 'actions' ? 'text-xs sm:text-sm' : '')}>
            {renderCell(col.id, data, symbol, watchlistId, onRemoveTicker)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Data fetchers
// ---------------------------------------------------------------------------

async function fetchQuote(symbol: string): Promise<Ticker[]> {
  if (!symbol) throw new Error('Symbol is required');
  const response = await fetch(`/api/fmp/quote?symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch quote data');
  return response.json();
}

async function fetchProfile(symbol: string): Promise<CompanyProfile[]> {
  if (!symbol) throw new Error('Symbol is required');
  const response = await fetch(`/api/fmp/profile?symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch profile data');
  return response.json();
}

async function fetchPriceChanges(symbol: string): Promise<{
  oneYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
  threeYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
  fiveYear?: { changePercent: number; currentPrice: number; historicalPrice: number; currentDate: string; historicalDate: string };
  avgVolume20D?: number;
}> {
  if (!symbol) throw new Error('Symbol is required');

  const today = getTodayDate();
  const fiveYearsAgo = getBusinessDateAgo(5);

  const response = await fetch(`/api/fmp/dailyprices?symbol=${symbol}&from=${fiveYearsAgo}&to=${today}`);
  if (!response.ok) throw new Error('Failed to fetch price changes data');

  const data = await response.json();
  const historical = data.historical;

  if (!historical || historical.length === 0) {
    return { oneYear: undefined, threeYear: undefined, fiveYear: undefined };
  }

  const sortedHistorical = historical.sort((a: { date: string }, b: { date: string }) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const currentData = sortedHistorical[0];
  const oneYearAgo = getBusinessDateAgo(1);
  const threeYearsAgo = getBusinessDateAgo(3);
  const fiveYearsAgoTarget = getBusinessDateAgo(5);

  const oneYearData = findClosestPrice(sortedHistorical, oneYearAgo);
  const threeYearData = findClosestPrice(sortedHistorical, threeYearsAgo);
  const fiveYearData = findClosestPrice(sortedHistorical, fiveYearsAgoTarget);

  const createPriceChangeData = (historicalData: typeof currentData | null) => {
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
  if (!symbol) throw new Error('Symbol is required');
  const response = await fetch(`/api/fmp/dividendhistory?symbol=${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch dividend data');
  const jsonData: StockDividend[] = await response.json();
  if (Array.isArray(jsonData) && jsonData.length > 0) return jsonData[0].yield;
  return null;
}

// ---------------------------------------------------------------------------
// Export button
// ---------------------------------------------------------------------------

interface ExportButtonProps {
  watchlist: WatchlistCard;
  visibleColumns: TableColumnDef[];
}

function ExportButton({ watchlist, visibleColumns }: ExportButtonProps) {
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
    const headers: string[] = [];
    const colIds: string[] = [];

    const headerMap: Record<string, string> = {
      symbol: 'Symbol', price: 'Price', change: 'Change ($)', changePercent: 'Change (%)',
      volume: 'Volume', avgVol20D: 'Avg Vol 20D', volRunRate: 'Vol Run Rate (%)',
      '1yChange': '1Y Change (%)', '3yChange': '3Y Change (%)', '5yChange': '5Y Change (%)',
      marketCap: 'Market Cap', sector: 'Sector', industry: 'Industry',
      peRatio: 'P/E Ratio', divYield: 'Dividend Yield (%)', dcr: 'DCR (%)', earnings: 'Next Earnings',
    };

    for (const col of visibleColumns) {
      if (col.id === 'actions') continue;
      headers.push(headerMap[col.id] ?? col.id);
      colIds.push(col.id);
    }

    const csvRows = [headers.map(h => `"${h}"`)];

    watchlist.tickers.forEach((ticker, index) => {
      const quote = quoteResults[index].data;
      const profile = profileResults[index].data;
      const priceChanges = priceChangeResults[index].data;

      const fmtPriceChange = (change: { changePercent: number } | null | undefined) => {
        if (!change) return '""';
        return `"${change.changePercent >= 0 ? '+' : ''}${formatPercentage(change.changePercent)}"`;
      };

      const avgVol20D = priceChanges?.avgVolume20D;
      const volRunRate = (quote?.volume && avgVol20D && avgVol20D > 0) ? (quote.volume / avgVol20D) * 100 : null;

      const cellMap: Record<string, string> = {
        symbol: `"${ticker.symbol}"`,
        price: quote ? `"$${formatNumber(quote.price)}"` : '""',
        change: quote ? `"${quote.change >= 0 ? '+' : '-'}${formatNumber(Math.abs(quote.change))}"` : '""',
        changePercent: quote ? `"${quote.changesPercentage >= 0 ? '+' : ''}${formatPercentage(quote.changesPercentage)}"` : '""',
        volume: quote ? `"${formatNumber(quote.volume)}"` : '""',
        avgVol20D: priceChanges?.avgVolume20D ? `"${formatNumber(Math.round(priceChanges.avgVolume20D))}"` : '""',
        volRunRate: volRunRate !== null ? `"${volRunRate.toFixed(0)}%"` : '""',
        '1yChange': fmtPriceChange(priceChanges?.oneYear),
        '3yChange': fmtPriceChange(priceChanges?.threeYear),
        '5yChange': fmtPriceChange(priceChanges?.fiveYear),
        marketCap: quote ? `"${formatMarketCap(quote.marketCap)}"` : '""',
        sector: profile?.sector ? `"${profile.sector}"` : '""',
        industry: profile?.industry ? `"${profile.industry}"` : '""',
        peRatio: quote?.pe ? `"${safeFormat(quote.pe)}"` : '""',
        divYield: '""',
        dcr: quote ? (() => { const d = calculateDCR(quote.price, quote.dayLow, quote.dayHigh); return d !== null ? `"${d.toFixed(1)}%"` : '""'; })() : '""',
        earnings: quote ? `"${formatEarningsDate(quote.earningsAnnouncement)}"` : '""',
      };

      csvRows.push(colIds.map(id => cellMap[id] ?? '""'));
    });

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
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
    <Button variant="ghost" size="icon" onClick={handleExport} className="h-8 w-8 rounded-none" title="Export watchlist">
      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

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
  visibleColumns: TableColumnDef[];
}

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
  visibleColumns,
}: WatchlistHeaderProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2">
        {watchlist.isEditing ? (
          <div className="flex items-center gap-1 sm:gap-2 w-full">
            <Input
              value={editNameInput}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => onKeyPress(e, onSaveWatchlistName)}
              className="h-8 rounded-none py-0.5 text-sm font-semibold"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={onSaveWatchlistName} className="shrink-0 h-8 w-8 rounded-none">
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0 mr-2">
              <h2 className="text-base font-semibold text-foreground truncate">{watchlist.name}</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ExportButton watchlist={watchlist} visibleColumns={visibleColumns} />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={onToggleEditMode} className="h-8 w-8 rounded-none flex-shrink-0">
                      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit Name</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none flex-shrink-0 text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent><p>Delete Watchlist</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DialogContent className="rounded-none">
                  <DialogHeader>
                    <DialogTitle>Delete Watchlist</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete watchlist &quot;{watchlist.name}&quot;? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-none">Cancel</Button>
                    <Button variant="destructive" onClick={() => { onRemoveWatchlist(watchlist.id); setShowDeleteDialog(false); }} className="rounded-none">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 py-2">
        <div className="flex gap-1.5">
          <Input
            placeholder="Enter tickers (e.g. AAPL, MSFT, TSLA)"
            value={newTickerInput}
            onChange={(e) => onNewTickerChange(e.target.value)}
            onKeyDown={(e) => onKeyPress(e, onAddTicker)}
            className="h-8 rounded-none border-0 bg-muted/50 text-xs sm:text-sm shadow-none focus-visible:ring-1"
          />
          <Button onClick={onAddTicker} title="Add ticker" className="h-8 rounded-none whitespace-nowrap flex-shrink-0 min-w-0 px-2 sm:px-3">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 md:mr-1" />
            <span className="hidden md:inline">Add Ticker</span>
            <span className="inline md:hidden ml-0.5">Add</span>
          </Button>
        </div>
      </CardContent>
    </>
  );
}

// ---------------------------------------------------------------------------
// Table header renderer
// ---------------------------------------------------------------------------

function renderColumnHeader(
  col: TableColumnDef,
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  handleSort: (column: string) => void,
  enableRowReorder: boolean,
  anchorExtra?: React.ReactNode,
) {
  if (col.isAnchor) {
    const showDragSpace = enableRowReorder;
    return (
      <SortableHeader
        key={col.id}
        column={col.id}
        label={
          <div className={cn("flex items-center gap-1.5 whitespace-nowrap", showDragSpace && "pl-10")}>
            {typeof col.label === 'string' ? col.label : col.label}
            {anchorExtra}
          </div>
        }
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        className="sticky left-0 z-20 !bg-background border-r border-border/60"
      />
    );
  }

  if (col.id === 'actions') {
    return <TableHead key={col.id} className="border-r border-border/60 text-center text-xs font-normal uppercase tracking-wide text-muted-foreground">Actions</TableHead>;
  }

  const sortable = col.sortable !== false;

  if (col.tooltip) {
    return (
      <SortableHeader
        key={col.id}
        column={col.id}
        label={
          <span className="flex items-center gap-1">
            {typeof col.label === 'string' ? col.label : col.label}
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                    <InfoIcon className="h-3 w-3 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={5}>
                  <p>{col.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        }
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={sortable ? handleSort : () => {}}
        className="border-r border-border/60"
      />
    );
  }

  return (
    <SortableHeader
      key={col.id}
      column={col.id}
      label={col.label}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={sortable ? handleSort : () => {}}
      className="border-r border-border/60"
    />
  );
}

// ---------------------------------------------------------------------------
// WatchlistTable
// ---------------------------------------------------------------------------

interface WatchlistTableProps {
  watchlist: WatchlistCard;
  onRemoveTicker: (watchlistId: string, ticker: string) => void;
  visibleColumns: TableColumnDef[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  enableRowReorder: boolean;
  orderedColumns: TableColumnDef[];
  hiddenColumns: Set<string>;
  onToggleColumn: (columnId: string) => void;
  onReorderColumns: (newOrder: string[]) => void;
  onResetColumns: () => void;
}

function WatchlistTable({ watchlist, onRemoveTicker, visibleColumns, sortColumn, sortDirection, handleSort, enableRowReorder, orderedColumns, hiddenColumns, onToggleColumn, onReorderColumns, onResetColumns }: WatchlistTableProps) {
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

  const dividendResults = useQueries({
    queries: watchlist.tickers.map(ticker => ({
      queryKey: ['dividend-yield', ticker.symbol],
      queryFn: () => fetchDividendYield(ticker.symbol),
      enabled: Boolean(ticker.symbol),
      staleTime: 1000 * 60 * 60 * 24,
    }))
  });

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

  const tickerDataMap = useMemo(() => {
    const map = new Map<string, TickerRowData>();

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

  const sortedTickers = useMemo(() => {
    if (!sortColumn) return watchlist.tickers;

    return [...watchlist.tickers].sort((a, b) => {
      const aData = tickerDataMap.get(a.symbol);
      const bData = tickerDataMap.get(b.symbol);
      const aQuote = aData?.quote;
      const bQuote = bData?.quote;

      let aVal: SortValue = null;
      let bVal: SortValue = null;

      switch (sortColumn) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'price': aVal = aQuote?.price; bVal = bQuote?.price; break;
        case 'change': aVal = aQuote?.change; bVal = bQuote?.change; break;
        case 'changePercent': aVal = aQuote?.changesPercentage; bVal = bQuote?.changesPercentage; break;
        case 'volume': aVal = aQuote?.volume; bVal = bQuote?.volume; break;
        case 'avgVol20D': aVal = aData?.priceChanges?.avgVolume20D; bVal = bData?.priceChanges?.avgVolume20D; break;
        case 'volRunRate': aVal = aData?.volumeRunRate; bVal = bData?.volumeRunRate; break;
        case '1yChange': aVal = aData?.priceChanges?.oneYear?.changePercent; bVal = bData?.priceChanges?.oneYear?.changePercent; break;
        case '3yChange': aVal = aData?.priceChanges?.threeYear?.changePercent; bVal = bData?.priceChanges?.threeYear?.changePercent; break;
        case '5yChange': aVal = aData?.priceChanges?.fiveYear?.changePercent; bVal = bData?.priceChanges?.fiveYear?.changePercent; break;
        case 'marketCap': aVal = aQuote?.marketCap; bVal = bQuote?.marketCap; break;
        case 'sector': aVal = aData?.profile?.sector; bVal = bData?.profile?.sector; break;
        case 'industry': aVal = aData?.profile?.industry; bVal = bData?.profile?.industry; break;
        case 'peRatio': aVal = aQuote?.pe; bVal = bQuote?.pe; break;
        case 'divYield': aVal = aData?.dividendYield; bVal = bData?.dividendYield; break;
        case 'dcr': {
          const aDcr = aQuote ? calculateDCR(aQuote.price, aQuote.dayLow, aQuote.dayHigh) : null;
          const bDcr = bQuote ? calculateDCR(bQuote.price, bQuote.dayLow, bQuote.dayHigh) : null;
          aVal = aDcr; bVal = bDcr; break;
        }
        case 'earnings': {
          aVal = aQuote?.earningsAnnouncement ? new Date(aQuote.earningsAnnouncement).getTime() : null;
          bVal = bQuote?.earningsAnnouncement ? new Date(bQuote.earningsAnnouncement).getTime() : null;
          break;
        }
        default: return 0;
      }

      return compareSortValues(aVal, bVal, sortDirection);
    });
  }, [watchlist.tickers, sortColumn, sortDirection, tickerDataMap]);

  return (
    <CardContent className="min-h-0 flex-1 overflow-hidden px-3 pt-0 pb-3">
      <SortableContext
        items={sortedTickers.map(t => `${t.symbol}-${watchlist.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="h-full min-h-0 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="h-full overflow-auto [&_th]:!h-9 [&_th]:!px-2 [&_th]:!py-1.5 [&_th]:!text-xs [&_th]:!font-normal [&_th]:!uppercase [&_th]:!tracking-wide [&_td]:!px-2 [&_td]:!text-xs">
            <Table>
              <TableHeader className="sticky top-0 z-30 bg-background">
                <TableRow className="border-b border-border/70 bg-muted/40 hover:bg-muted/40">
                  {visibleColumns.map(col =>
                    renderColumnHeader(
                      col, sortColumn, sortDirection, handleSort, enableRowReorder,
                      col.isAnchor ? (
                        <ColumnSettingsPopover
                          columns={orderedColumns}
                          hiddenColumns={hiddenColumns}
                          onToggleColumn={onToggleColumn}
                          onReorderColumns={onReorderColumns}
                          onReset={onResetColumns}
                        />
                      ) : undefined
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.tickers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
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
                        data={data ?? {
                          isQuoteLoading: true,
                          isProfileLoading: true,
                          isDividendLoading: true,
                          isPriceChangesLoading: true,
                          isVolumeRunRateLoading: true,
                        }}
                        isSortActive={isSortActive}
                        enableRowReorder={enableRowReorder}
                        visibleColumns={visibleColumns}
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

// ---------------------------------------------------------------------------
// WatchlistDetail (public export)
// ---------------------------------------------------------------------------

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
  const {
    sortColumn,
    sortDirection,
    handleSort,
    visibleColumns,
    hiddenColumns,
    toggleColumn,
    reorderColumns,
    resetColumnsToDefaults,
    enableRowReorder,
    orderedColumns,
  } = useSortableTable({
    columns: WATCHLIST_COLUMNS,
    tableId: 'watchlist-detail',
    enableRowReorder: true,
    enableClearSort: true,
  });

  return (
    <Card className="flex h-full min-h-0 w-full flex-col rounded-none border-0 bg-card/80 shadow-none">
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
        visibleColumns={visibleColumns}
      />
      <WatchlistTable
        key={`table-${watchlist.id}-${watchlist.tickers.map(t => t.symbol).join(',')}`}
        watchlist={watchlist}
        onRemoveTicker={onRemoveTicker}
        visibleColumns={visibleColumns}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        handleSort={handleSort}
        enableRowReorder={enableRowReorder}
        orderedColumns={orderedColumns}
        hiddenColumns={hiddenColumns}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetColumnsToDefaults}
      />
    </Card>
  );
}
