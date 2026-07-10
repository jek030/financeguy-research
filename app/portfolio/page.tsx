'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { Archive, ArchiveRestore, CalendarIcon, InfoIcon, X, Loader2, Pencil, PlusCircle, Star, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { useSortableTable } from '@/hooks/useSortableTable';
import { ColumnSettingsPopover } from '@/components/ui/ColumnSettingsPopover';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { quoteQueryOptions, useQuote } from '@/hooks/FMP/useQuote';
import { usePortfolio, type StockPosition } from '@/hooks/usePortfolio';
import { BacktestTab } from '@/components/ui/BacktestTab';
import { useAuth } from '@/lib/context/auth-context';
import { getRemainingShares, getRealizedGain, isFullyClosed } from '@/utils/portfolioCalculations';
import { ExitsCell } from '@/components/portfolio/ExitsCell';
import { EditPositionModal } from '@/components/portfolio/EditPositionModal';
import { PositionChartModal } from '@/components/portfolio/PositionChartModal';
import { PositionSizingCalculator } from '@/components/portfolio/PositionSizingCalculator';
import Link from 'next/link';
import type { TableColumnDef } from '@/lib/table-types';

// Helper function to format currency
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 10,
});

const formatCurrency = (value: number) => {
  return currencyFormatter.format(value);
};

const formatCurrencyTwoDecimals = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Helper function to calculate percentage change from cost
const calculatePercentageChange = (targetValue: number, cost: number) => {
  if (cost === 0) return 0;
  return ((targetValue - cost) / cost) * 100;
};

const hasConfiguredStopLoss = (cost: number, stopLoss: number) => {
  return Number.isFinite(cost) && cost > 0 && Number.isFinite(stopLoss) && stopLoss > 0;
};

const calculateOpenRiskAmount = (cost: number, stopLoss: number, quantity: number) => {
  if (quantity <= 0 || !hasConfiguredStopLoss(cost, stopLoss)) {
    return 0;
  }

  return Math.abs(cost - stopLoss) * quantity;
};

const calculateInitialRiskAmount = (cost: number, stopLoss: number, quantity: number) => {
  if (quantity <= 0 || !hasConfiguredStopLoss(cost, stopLoss)) {
    return 0;
  }
  return Math.abs(cost - stopLoss) * quantity;
};

const getOpenRiskDisplay = (position: StockPosition) => {
  if (position.closedDate) {
    return {
      text: `0.00% (${formatCurrency(0)})`,
      colorClass: '',
    };
  }

  if (!hasConfiguredStopLoss(position.cost, position.stopLoss)) {
    return {
      text: 'N/A',
      colorClass: 'text-muted-foreground',
    };
  }

  const openRiskPercent = calculatePercentageChange(position.stopLoss, position.cost);
  const openRiskAmount = calculateOpenRiskAmount(position.cost, position.stopLoss, position.quantity);

  return {
    text: `${openRiskPercent >= 0 ? '+' : ''}${openRiskPercent.toFixed(2)}% (${formatCurrency(openRiskAmount)})`,
    colorClass: openRiskPercent < 0 ? 'text-red-400' : 'text-green-600 dark:text-green-400',
  };
};

const getOpenHeatPercent = (position: StockPosition, portfolioValue: number): number | null => {
  if (position.closedDate) {
    return 0;
  }

  if (portfolioValue <= 0) {
    return null;
  }

  if (!hasConfiguredStopLoss(position.cost, position.stopLoss)) {
    return null;
  }

  const riskPerShare = Math.abs(position.cost - position.stopLoss);
  const totalRisk = riskPerShare * position.quantity;
  return (totalRisk / portfolioValue) * 100;
};

const getOpenHeatColorClass = (heatPercent: number | null) => {
  if (heatPercent === null || heatPercent <= 1) {
    return '';
  }

  return heatPercent > 2 ? 'text-red-400' : 'text-orange-400';
};

const CHART_POSITIVE_BAR_COLOR = 'hsl(142, 76%, 36%)';
const CHART_NEGATIVE_BAR_COLOR = 'hsl(0, 84%, 60%)';
const CHART_NEUTRAL_BAR_COLOR = 'hsl(var(--muted-foreground))';

const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 10,
    color: 'hsl(var(--popover-foreground))',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.28)',
    padding: '8px 10px',
  },
  itemStyle: {
    color: 'hsl(var(--popover-foreground))',
  },
  labelStyle: {
    color: 'hsl(var(--popover-foreground))',
    fontWeight: 600,
  },
  cursor: { fill: 'hsl(var(--muted) / 0.35)' },
};

const formatAxisCurrencyTick = (value: number | string) =>
  `${Number(value) >= 0 ? '+' : ''}$${Math.round(Number(value))}`;

const formatAxisPercentTick = (value: number | string, precision = 1) =>
  `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(precision)}%`;

const formatSignedPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const getSignedPercentColorClass = (value: number) => (value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400');
const getAdaptiveXAxisInterval = (itemCount: number, maxVisibleTicks: number) => {
  if (itemCount <= maxVisibleTicks) {
    return 0;
  }
  return Math.ceil(itemCount / maxVisibleTicks) - 1;
};

const normalizeToLocalMidnight = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const calculateDaysInTrade = (openDate: Date, closedDate?: Date | null) => {
  const start = normalizeToLocalMidnight(openDate);
  const endSource = closedDate ?? new Date();
  const end = normalizeToLocalMidnight(endSource);
  const diff = differenceInCalendarDays(end, start);
  return diff < 0 ? 0 : diff;
};

const allocationColors = [
  'hsl(199, 89%, 48%)',
  'hsl(142, 76%, 36%)',
  'hsl(25, 95%, 53%)',
  'hsl(291, 76%, 53%)',
  'hsl(14, 89%, 45%)',
  'hsl(189, 94%, 43%)',
  'hsl(48, 96%, 53%)',
];

const PORTFOLIO_COLUMNS: TableColumnDef[] = [
  { id: 'symbol', label: 'Symbol', isAnchor: true },
  { id: 'price', label: 'Price' },
  { id: 'type', label: 'Type' },
  { id: 'cost', label: 'Cost' },
  { id: 'quantity', label: 'Qty' },
  { id: 'remainingShares', label: 'Rem. Shares' },
  { id: 'netCost', label: 'Net Cost' },
  { id: 'equity', label: 'Equity' },
  { id: 'gainLoss', label: 'Gain/Loss $' },
  { id: 'portfolioGain', label: 'Portfolio Gain', tooltip: 'Realized + unrealized gain as % of current portfolio value' },
  { id: 'realizedGain', label: 'Realized $' },
  { id: 'rMultiple', label: 'R', tooltip: 'Realized R using initial stop and staged exits' },
  { id: 'portfolioPercent', label: '% Portfolio' },
  { id: 'initialStopLoss', label: 'Init. SL' },
  { id: 'stopLoss', label: 'Stop Loss' },
  { id: 'openRisk', label: 'Open Risk %', tooltip: '% change from cost to stop loss' },
  { id: 'openHeat', label: 'Open Heat %', tooltip: '% of portfolio risked if stop loss is hit' },
  { id: 'exits', label: 'Exits', tooltip: 'Click to expand exit rows' },
  { id: 'openDate', label: 'Open Date' },
  { id: 'closedDate', label: 'Closed Date' },
  { id: 'daysInTrade', label: 'Days' },
  { id: 'actions', label: 'Actions', alwaysVisible: true, sortable: false },
];

type HistogramBucketType = 'negative' | 'neutral' | 'positive';
type HistogramBucketKey =
  | 'neg-32-plus'
  | 'neg-16-32'
  | 'neg-8-16'
  | 'neg-4-8'
  | 'neg-2-4'
  | 'neg-0-2'
  | 'zero'
  | 'pos-0-2'
  | 'pos-2-4'
  | 'pos-4-8'
  | 'pos-8-16'
  | 'pos-16-32'
  | 'pos-32-plus';
type RealizedEquityBucketKey =
  | 'neg-5-plus'
  | 'neg-2-5'
  | 'neg-1-2'
  | 'neg-0.5-1'
  | 'neg-0.25-0.5'
  | 'neg-0-0.25'
  | 'pos-0-0.25'
  | 'pos-0.25-0.5'
  | 'pos-0.5-1'
  | 'pos-1-2'
  | 'pos-2-5'
  | 'pos-5-plus';
type DistributionBucketKey = HistogramBucketKey | RealizedEquityBucketKey;

const HISTOGRAM_BUCKETS: Array<{ key: HistogramBucketKey; label: string; bucketType: HistogramBucketType }> = [
  { key: 'neg-32-plus', label: '<-32%', bucketType: 'negative' },
  { key: 'neg-16-32', label: '-32% to -16%', bucketType: 'negative' },
  { key: 'neg-8-16', label: '-16% to -8%', bucketType: 'negative' },
  { key: 'neg-4-8', label: '-8% to -4%', bucketType: 'negative' },
  { key: 'neg-2-4', label: '-4% to -2%', bucketType: 'negative' },
  { key: 'neg-0-2', label: '-2% to 0%', bucketType: 'negative' },
  { key: 'zero', label: '0%', bucketType: 'neutral' },
  { key: 'pos-0-2', label: '0% to 2%', bucketType: 'positive' },
  { key: 'pos-2-4', label: '2% to 4%', bucketType: 'positive' },
  { key: 'pos-4-8', label: '4% to 8%', bucketType: 'positive' },
  { key: 'pos-8-16', label: '8% to 16%', bucketType: 'positive' },
  { key: 'pos-16-32', label: '16% to 32%', bucketType: 'positive' },
  { key: 'pos-32-plus', label: '32%+', bucketType: 'positive' },
];

type HistogramDistributionEntry<TBinKey extends DistributionBucketKey = HistogramBucketKey> = {
  binKey: TBinKey;
  rangeLabel: string;
  trades: number;
  bucketType: HistogramBucketType;
};

const REALIZED_EQUITY_BUCKETS: Array<{ key: RealizedEquityBucketKey; label: string; bucketType: HistogramBucketType }> = [
  { key: 'neg-5-plus', label: '< -5%', bucketType: 'negative' },
  { key: 'neg-2-5', label: '-5% to -2%', bucketType: 'negative' },
  { key: 'neg-1-2', label: '-2% to -1%', bucketType: 'negative' },
  { key: 'neg-0.5-1', label: '-1% to -0.5%', bucketType: 'negative' },
  { key: 'neg-0.25-0.5', label: '-0.5% to -0.25%', bucketType: 'negative' },
  { key: 'neg-0-0.25', label: '-0.25% to 0%', bucketType: 'negative' },
  { key: 'pos-0-0.25', label: '0% to 0.25%', bucketType: 'positive' },
  { key: 'pos-0.25-0.5', label: '0.25% to 0.5%', bucketType: 'positive' },
  { key: 'pos-0.5-1', label: '0.5% to 1%', bucketType: 'positive' },
  { key: 'pos-1-2', label: '1% to 2%', bucketType: 'positive' },
  { key: 'pos-2-5', label: '2% to 5%', bucketType: 'positive' },
  { key: 'pos-5-plus', label: '5%+', bucketType: 'positive' },
];

type HistogramDrilldownType = 'realizedGain' | 'realizedEquity';
type HoldingPeriodBucketKey =
  | 'days-0'
  | 'days-1'
  | 'days-2-3'
  | 'days-3-5'
  | 'days-5-10'
  | 'days-10-30'
  | 'days-30-plus';

const HOLDING_PERIOD_BUCKETS: Array<{ key: HoldingPeriodBucketKey; label: string }> = [
  { key: 'days-0', label: '0 Days' },
  { key: 'days-1', label: '1 Day' },
  { key: 'days-2-3', label: '2-3 Days' },
  { key: 'days-3-5', label: '3-5 Days' },
  { key: 'days-5-10', label: '5-10 Days' },
  { key: 'days-10-30', label: '10-30 Days' },
  { key: 'days-30-plus', label: '30+ Days' },
];

const getHoldingPeriodBucketKey = (days: number): HoldingPeriodBucketKey => {
  if (days <= 0) return 'days-0';
  if (days <= 1) return 'days-1';
  if (days <= 3) return 'days-2-3';
  if (days <= 5) return 'days-3-5';
  if (days <= 10) return 'days-5-10';
  if (days <= 30) return 'days-10-30';
  return 'days-30-plus';
};

type PortfolioHeroDrilldownSelection =
  | {
      kind: 'distribution';
      histogramType: HistogramDrilldownType;
      binKey: DistributionBucketKey;
      rangeLabel: string;
    }
  | {
      kind: 'holdingPeriod';
      rowId: string;
      rowLabel: string;
    }
  | {
      kind: 'realizedSymbol';
      symbol: string;
    }
  | {
      kind: 'realizedHoldingPeriod';
      bucketKey: HoldingPeriodBucketKey;
      rangeLabel: string;
    };

const HISTOGRAM_DRILLDOWN_COLUMNS: Array<{ id: string; label: string }> = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'type', label: 'Type' },
  { id: 'quantity', label: 'Qty' },
  { id: 'cost', label: 'Cost' },
  { id: 'netCost', label: 'Net Cost' },
  { id: 'stopLoss', label: 'Stop Loss' },
  { id: 'realizedGain', label: 'Realized $' },
  { id: 'realizedPercent', label: 'Realized %' },
  { id: 'realizedEquityPercent', label: 'Realized Equity %' },
  { id: 'rMultiple', label: 'R' },
  { id: 'openDate', label: 'Open Date' },
  { id: 'closedDate', label: 'Closed Date' },
  { id: 'holdingPeriod', label: 'Holding Period' },
];

const getBinKeyForPercent = (percent: number): HistogramBucketKey => {
  if (percent === 0) return 'zero';

  if (percent > 0) {
    if (percent < 2) return 'pos-0-2';
    if (percent < 4) return 'pos-2-4';
    if (percent < 8) return 'pos-4-8';
    if (percent < 16) return 'pos-8-16';
    if (percent < 32) return 'pos-16-32';
    return 'pos-32-plus';
  }

  if (percent > -2) return 'neg-0-2';
  if (percent > -4) return 'neg-2-4';
  if (percent > -8) return 'neg-4-8';
  if (percent > -16) return 'neg-8-16';
  if (percent > -32) return 'neg-16-32';
  return 'neg-32-plus';
};

const getRealizedEquityBinKeyForPercent = (percent: number): RealizedEquityBucketKey => {
  if (percent >= 0) {
    if (percent <= 0.25) return 'pos-0-0.25';
    if (percent <= 0.5) return 'pos-0.25-0.5';
    if (percent <= 1) return 'pos-0.5-1';
    if (percent <= 2) return 'pos-1-2';
    if (percent <= 5) return 'pos-2-5';
    return 'pos-5-plus';
  }

  if (percent >= -0.25) return 'neg-0-0.25';
  if (percent >= -0.5) return 'neg-0.25-0.5';
  if (percent >= -1) return 'neg-0.5-1';
  if (percent >= -2) return 'neg-1-2';
  if (percent >= -5) return 'neg-2-5';
  return 'neg-5-plus';
};

function renderPortfolioColumnHeader(
  col: TableColumnDef,
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  handleSort: (column: string) => void,
  anchorExtra?: React.ReactNode,
) {
  if (col.isAnchor) {
    return (
      <SortableHeader
        key={col.id}
        column={col.id}
        label={
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {typeof col.label === 'string' ? col.label : col.label}
            {anchorExtra}
          </div>
        }
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        className="sticky left-0 top-0 z-30 !bg-background border-r border-border"
      />
    );
  }

  if (col.id === 'actions') {
    return <TableHead key={col.id} className="text-center">Actions</TableHead>;
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
        className="border-r"
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
      className="border-r"
    />
  );
}

// Helper function to calculate gain/loss
const calculateGainLoss = (currentPrice: number, cost: number, quantity: number, type: 'Long' | 'Short') => {
  if (type === 'Long') {
    return (currentPrice - cost) * quantity;
  } else {
    // For short positions: gain when price goes down (cost > currentPrice)
    return (cost - currentPrice) * quantity;
  }
};

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

// Helper function to calculate realized gain for a position
const calculateRealizedGainForPosition = (position: StockPosition): number => {
  return getRealizedGain(position);
};

const calculateInitialRiskForPosition = (position: StockPosition): number => {
  if (!hasConfiguredStopLoss(position.cost, position.initialStopLoss)) {
    return 0;
  }
  return Math.abs(position.cost - position.initialStopLoss) * position.quantity;
};

const calculateProjectedGainForPosition = (position: StockPosition, currentPrice?: number): number => {
  const realizedGain = calculateRealizedGainForPosition(position);
  const remaining = getRemainingShares(position);
  if (isPositionFullyClosed(position) || remaining <= 0) {
    return realizedGain;
  }

  const markPrice = typeof currentPrice === 'number' ? currentPrice : position.cost;
  const unrealizedGain = calculateGainLoss(markPrice, position.cost, remaining, position.type);
  return realizedGain + unrealizedGain;
};

const calculateDisplayedRMultipleForPosition = (position: StockPosition, currentPrice?: number): number => {
  const initialRisk = calculateInitialRiskForPosition(position);
  if (initialRisk <= 0) {
    return 0;
  }

  const gain = isPositionFullyClosed(position)
    ? calculateRealizedGainForPosition(position)
    : calculateProjectedGainForPosition(position, currentPrice);

  return gain / initialRisk;
};

const isPositionFullyClosed = (position: StockPosition) => {
  return Boolean(position.closedDate) || isFullyClosed(position);
};

// Component to fetch and display current price
function PriceCell({ symbol }: { symbol: string }) {
  const { data: quote, isLoading, error } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">N/A</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{formatCurrency(quote.price)}</span>
      <span className={cn("text-xs font-medium", getSignedPercentColorClass(quote.changesPercentage))}>
        {formatSignedPercent(quote.changesPercentage)}
      </span>
    </div>
  );
}

// Component to display gain/loss
function GainLossCell({ 
  symbol, 
  cost, 
  quantity, 
  type 
}: { 
  symbol: string; 
  cost: number; 
  quantity: number; 
  type: 'Long' | 'Short'; 
}) {
  const { data: quote, isLoading, error } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">N/A</span>
      </div>
    );
  }

  const gainLoss = calculateGainLoss(quote.price, cost, quantity, type);
  const gainLossPercent = calculatePercentageChange(quote.price, cost);
  
  // For short positions, reverse the percentage calculation
  const displayPercent = type === 'Short' ? -gainLossPercent : gainLossPercent;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        "font-medium",
        gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {formatCurrency(gainLoss)}
      </span>
      <span className={cn("text-xs font-medium", getSignedPercentColorClass(displayPercent))}>
        {formatSignedPercent(displayPercent)}
      </span>
    </div>
  );
}

function SummaryGainLossCell({
  symbol,
  positions,
}: {
  symbol: string;
  positions: StockPosition[];
}) {
  const { data: quote, isLoading, error } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">N/A</span>
      </div>
    );
  }

  const gainLoss = positions.reduce(
    (sum, position) => sum + calculateGainLoss(quote.price, position.cost, getRemainingShares(position), position.type),
    0,
  );
  const totalCostBasis = positions.reduce((sum, position) => sum + (position.cost * getRemainingShares(position)), 0);
  const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;

  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        "font-medium",
        gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}>
        {formatCurrency(gainLoss)}
      </span>
      <span className={cn("text-xs font-medium", getSignedPercentColorClass(gainLossPercent))}>
        {formatSignedPercent(gainLossPercent)}
      </span>
    </div>
  );
}

// Progress bar component for metrics
function ProgressBar({ 
  value, 
  max = 100, 
  colorClass = "bg-primary",
  bgClass = "bg-muted/50"
}: { 
  value: number; 
  max?: number;
  colorClass?: string;
  bgClass?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={cn("h-1.5 w-full rounded-full overflow-hidden", bgClass)}>
      <div 
        className={cn("h-full rounded-full transition-all duration-300", colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Metric card component for hero section
function MetricCard({ 
  label, 
  value, 
  subValue,
  showBar = false,
  barValue = 0,
  barMax = 100,
  barColorClass,
  valueColorClass,
  isLoading = false
}: { 
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  showBar?: boolean;
  barValue?: number;
  barMax?: number;
  barColorClass?: string;
  valueColorClass?: string;
  isLoading?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      {isLoading ? (
        <div className="h-6 w-20 bg-muted/50 animate-pulse rounded" />
      ) : (
        <p className={cn("text-lg font-bold font-mono", valueColorClass)}>
          {value}
        </p>
      )}
      {subValue && !isLoading && (
        <p className="text-xs text-muted-foreground font-mono">{subValue}</p>
      )}
      {showBar && !isLoading && (
        <ProgressBar 
          value={barValue} 
          max={barMax} 
          colorClass={barColorClass}
        />
      )}
    </div>
  );
}

// Net portfolio open risk: sum of signed $/share × remaining shares per position.
// Long: (cost − stop) × shares — positive when stop is below cost (downside to stop); negative when stop is above cost (reduces net risk).
// Short: (stop − cost) × shares — same idea mirrored for adverse move to the stop.
// Clamped at 0 — unfavorable-to-stop placement cannot yield negative “risk”.
function calculateTotalOpenRisk(positions: StockPosition[]): number {
  const raw = positions
    .filter((pos) => !pos.closedDate && getRemainingShares(pos) > 0)
    .reduce((total, pos) => {
      if (!hasConfiguredStopLoss(pos.cost, pos.stopLoss)) {
        return total;
      }
      const perShare =
        pos.type === 'Short' ? pos.stopLoss - pos.cost : pos.cost - pos.stopLoss;
      return total + perShare * getRemainingShares(pos);
    }, 0);
  return Math.max(0, raw);
}

type PortfolioTab = 'positions' | 'calendar' | 'stats' | 'backtest';
const SELECTED_PORTFOLIO_TAB_STORAGE_KEY = 'financeguy-selected-portfolio-tab';

const isPortfolioTab = (value: string): value is PortfolioTab =>
  value === 'positions' || value === 'calendar' || value === 'stats' || value === 'backtest';

const readStoredSelectedPortfolioTab = (userId?: string): PortfolioTab => {
  if (typeof window === 'undefined') {
    return 'positions';
  }

  try {
    const suffix = userId ? `:${userId}` : '';
    const stored = window.localStorage.getItem(`${SELECTED_PORTFOLIO_TAB_STORAGE_KEY}${suffix}`);
    if (stored && isPortfolioTab(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read errors
  }

  return 'positions';
};

interface PortfolioToolbarProps {
  portfolios: Array<{ portfolio_key: number | string; portfolio_name: string; is_retired?: boolean }>;
  selectedPortfolioKey: number | null;
  handlePortfolioSelection: (value: string) => void;
  isPortfolioLoading: boolean;
  defaultPortfolioKey: number | null;
  setPortfolioAsDefault: (key: number | null) => void;
  handleOpenCreatePortfolio: () => void;
  handleEditPortfolio: () => void;
  isPortfolioRetired: boolean;
  onRetireClick: () => void;
  activeTab: PortfolioTab;
  handleTabChange: (value: string) => void;
}

function PortfolioToolbar({
  portfolios,
  selectedPortfolioKey,
  handlePortfolioSelection,
  isPortfolioLoading,
  defaultPortfolioKey,
  setPortfolioAsDefault,
  handleOpenCreatePortfolio,
  handleEditPortfolio,
  isPortfolioRetired,
  onRetireClick,
  activeTab,
  handleTabChange,
}: PortfolioToolbarProps) {
  return (
    <div className="border-b border-border">
      <div className="flex flex-col gap-2 px-3 py-1.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <Select
            value={selectedPortfolioKey !== null ? String(selectedPortfolioKey) : undefined}
            onValueChange={handlePortfolioSelection}
            disabled={isPortfolioLoading || portfolios.length === 0}
          >
            <SelectTrigger className="h-8 w-full min-w-[180px] text-sm bg-background/50 sm:w-[220px]" aria-label="Select portfolio">
              <SelectValue placeholder="Select portfolio" />
            </SelectTrigger>
            <SelectContent>
              {portfolios.map((record) => (
                <SelectItem
                  key={record.portfolio_key}
                  value={String(record.portfolio_key)}
                  className={cn(Boolean(record.is_retired) && 'text-muted-foreground')}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">
                      {record.portfolio_name || `Portfolio ${record.portfolio_key}`}
                    </span>
                    {Boolean(record.is_retired) && (
                      <span className="shrink-0 rounded border border-border/60 px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Retired
                      </span>
                    )}
                    {defaultPortfolioKey === Number(record.portfolio_key) && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isPortfolioLoading && (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading</span>
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (selectedPortfolioKey === defaultPortfolioKey) {
                      setPortfolioAsDefault(null);
                    } else if (selectedPortfolioKey !== null) {
                      setPortfolioAsDefault(selectedPortfolioKey);
                    }
                  }}
                  disabled={isPortfolioLoading || selectedPortfolioKey === null}
                  className="h-8 w-8 p-0"
                >
                  <Star className={cn(
                    "h-4 w-4",
                    selectedPortfolioKey === defaultPortfolioKey
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedPortfolioKey === defaultPortfolioKey ? "Remove default" : "Set as default"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleOpenCreatePortfolio}
                  disabled={isPortfolioLoading}
                  className="h-8 w-8 p-0"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create New Portfolio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={handleEditPortfolio} className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Portfolio</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {selectedPortfolioKey !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onRetireClick}
                    disabled={isPortfolioLoading}
                    className="h-8 w-8 p-0"
                  >
                    {isPortfolioRetired ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isPortfolioRetired ? 'Un-retire Portfolio' : 'Retire Portfolio'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {isPortfolioRetired && (
            <span className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Retired
            </span>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <div className="inline-flex items-center rounded-md border border-border/60 bg-background/50 p-0.5">
            <Button
              size="sm"
              variant={activeTab === 'positions' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 !text-sm font-medium"
              onClick={() => handleTabChange('positions')}
            >
              Positions
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'calendar' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 !text-sm font-medium"
              onClick={() => handleTabChange('calendar')}
            >
              Calendar
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'stats' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 !text-sm font-medium"
              onClick={() => handleTabChange('stats')}
            >
              Stats
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'backtest' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 !text-sm font-medium"
              onClick={() => handleTabChange('backtest')}
            >
              Backtest
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Portfolio stats card component
interface PortfolioHeroProps {
  portfolioName: string;
  portfolioValue: number;
  positions: StockPosition[];
  isLoading: boolean;
  tradeStatistics: {
    totalClosed: number;
    winnerCount: number;
    loserCount: number;
    battingAverage: number;
    avgGainDollar: number;
    avgGainPercent: number;
    avgGainEquity: number;
    avgLossDollar: number;
    avgLossPercent: number;
    avgLossEquity: number;
    maxGainDollar: number;
    maxGainPercent: number;
    maxGainEquity: number;
    maxLossDollar: number;
    maxLossPercent: number;
    maxLossEquity: number;
    avgWinnerR: number;
    avgLoserR: number;
    avgR: number;
    avgEquityPerTrade: number;
    avgNetCost: number;
    avgWinnerDays: number;
    avgLoserDays: number;
    riskRewardRatio: number;
  } | null;
}

function PortfolioHeroSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden p-4 md:p-5">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr_1fr] gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function PortfolioHero({
  portfolioName,
  portfolioValue,
  positions,
  isLoading,
  tradeStatistics,
}: PortfolioHeroProps) {
  const [selectedDrilldown, setSelectedDrilldown] = useState<PortfolioHeroDrilldownSelection | null>(null);

  // Calculate metrics
  const totalOpenRisk = useMemo(() => calculateTotalOpenRisk(positions), [positions]);
  const riskPercent = portfolioValue > 0 ? (totalOpenRisk / portfolioValue) * 100 : 0;
  const openPositionsForPnl = useMemo(
    () => positions.filter((position) => !isPositionFullyClosed(position) && getRemainingShares(position) > 0),
    [positions],
  );
  const pnlQuoteQueries = useQueries({
    queries: openPositionsForPnl.map((position) => quoteQueryOptions(position.symbol)),
  });
  const isUnrealizedLoading = pnlQuoteQueries.some((query) => query.isLoading);

  const unrealizedGain = useMemo(() => {
    return openPositionsForPnl.reduce((total, position, index) => {
      const currentPrice = pnlQuoteQueries[index]?.data?.price;
      if (typeof currentPrice !== 'number') {
        return total;
      }
      return total + calculateGainLoss(currentPrice, position.cost, getRemainingShares(position), position.type);
    }, 0);
  }, [openPositionsForPnl, pnlQuoteQueries]);

  const openEquity = useMemo(() => {
    return openPositionsForPnl.reduce((total, position, index) => {
      const currentPrice = pnlQuoteQueries[index]?.data?.price;
      if (typeof currentPrice !== 'number') {
        return total;
      }
      return total + (currentPrice * getRemainingShares(position));
    }, 0);
  }, [openPositionsForPnl, pnlQuoteQueries]);

  const realizedGain = useMemo(() => {
    const total = positions.reduce((sum, position) => {
      return sum + calculateRealizedGainForPosition(position);
    }, 0);

    return roundToTwoDecimals(total);
  }, [positions]);

  const unrealizedPercent = portfolioValue > 0 ? (unrealizedGain / portfolioValue) * 100 : 0;
  const realizedPercent = portfolioValue > 0 ? (realizedGain / portfolioValue) * 100 : 0;
  const currentBalance = portfolioValue + realizedGain;
  const unrealizedBalance = currentBalance + unrealizedGain;
  const currentBalancePercent = portfolioValue > 0 ? ((currentBalance - portfolioValue) / portfolioValue) * 100 : 0;
  const unrealizedBalancePercent = portfolioValue > 0 ? ((unrealizedBalance - portfolioValue) / portfolioValue) * 100 : 0;

  const exposure = useMemo(() => {
    if (currentBalance <= 0) {
      return openPositionsForPnl.length === 0 ? 0 : 100;
    }
    return (openEquity / currentBalance) * 100;
  }, [openEquity, currentBalance, openPositionsForPnl.length]);
  
  // Exposure color logic
  const exposureColorClass = "text-foreground";
  
  const exposureBarColor = exposure > 100 
    ? "bg-red-500" 
    : exposure > 80 
      ? "bg-yellow-500" 
      : "bg-emerald-500";
  
  // Risk color logic  
  const riskColorClass = "text-foreground";
      
  const riskBarColor = riskPercent > 10 
    ? "bg-red-500" 
    : riskPercent > 5 
      ? "bg-orange-500" 
      : "bg-emerald-500";

  const realizedExitRows = useMemo<PortfolioDrilldownRow[]>(
    () => {
      const rows: PortfolioDrilldownRow[] = [];
      positions.forEach((position) => {
        position.exits.forEach((exit) => {
          if (!exit.exitDate || exit.shares <= 0) {
            return;
          }
          const realizedGain = calculateGainLoss(exit.price, position.cost, exit.shares, position.type);
          rows.push({
            kind: 'exit',
            id: `${position.id}-exit-${exit.id}`,
            position,
            exitDate: exit.exitDate,
            exitShares: exit.shares,
            exitPrice: exit.price,
            realizedGain,
            netCost: position.cost * exit.shares,
          });
        });
      });
      return rows;
    },
    [positions],
  );

  const balanceOverTimeData = useMemo(() => {
    const eventsByDate = new Map<number, number>();

    realizedExitRows.forEach((row) => {
      if (row.kind !== 'exit') {
        return;
      }
      const dayTimestamp = new Date(
        row.exitDate.getFullYear(),
        row.exitDate.getMonth(),
        row.exitDate.getDate(),
      ).getTime();
      eventsByDate.set(dayTimestamp, (eventsByDate.get(dayTimestamp) ?? 0) + row.realizedGain);
    });

    const sortedDates = Array.from(eventsByDate.keys()).sort((a, b) => a - b);
    let runningBalance = portfolioValue;
    const series: Array<{ pointLabel: string; balance: number; dayRealizedGain: number }> = [
      { pointLabel: 'Start', balance: portfolioValue, dayRealizedGain: 0 },
    ];

    sortedDates.forEach((timestamp) => {
      const dayGain = eventsByDate.get(timestamp) ?? 0;
      runningBalance += dayGain;
      series.push({
        pointLabel: format(new Date(timestamp), 'MMM d, yyyy'),
        balance: runningBalance,
        dayRealizedGain: dayGain,
      });
    });

    return series;
  }, [realizedExitRows, portfolioValue]);

  const balanceChartDomain = useMemo(() => {
    if (balanceOverTimeData.length === 0) {
      const start = portfolioValue || 0;
      return [start - 1, start + 1] as const;
    }

    const balances = balanceOverTimeData.map((point) => point.balance);
    let minBalance = Math.min(...balances);
    let maxBalance = Math.max(...balances);

    if (minBalance === maxBalance) {
      const pad = Math.max(Math.abs(minBalance) * 0.01, 1);
      minBalance -= pad;
      maxBalance += pad;
    } else {
      const pad = (maxBalance - minBalance) * 0.08;
      minBalance -= pad;
      maxBalance += pad;
    }

    return [minBalance, maxBalance] as const;
  }, [balanceOverTimeData, portfolioValue]);

  const holdingPeriodByExitData = useMemo(() => {
    const exitRows = realizedExitRows
      .filter((row): row is Extract<PortfolioDrilldownRow, { kind: 'exit' }> => row.kind === 'exit')
      .sort((a, b) => a.exitDate.getTime() - b.exitDate.getTime());

    return exitRows.map((row, index) => {
      const totalGainLoss = row.realizedGain;
      const portfolioGainPercent = portfolioValue > 0 ? (totalGainLoss / portfolioValue) * 100 : 0;
      return {
        rowId: row.id,
        rowLabel: `${row.position.symbol}-${index + 1}`,
        totalGainLoss,
        portfolioGainPercent,
        closedAt: row.exitDate.getTime(),
        openedAt: row.position.openDate.getTime(),
      };
    });
  }, [realizedExitRows, portfolioValue]);

  const histogramAxisDomain = useMemo(() => {
    if (holdingPeriodByExitData.length === 0) {
      return {
        minDollar: -1,
        maxDollar: 1,
        minPercent: -1,
        maxPercent: 1,
      };
    }

    const values = holdingPeriodByExitData.map((entry) => entry.totalGainLoss);
    let minDollar = Math.min(...values, 0);
    let maxDollar = Math.max(...values, 0);

    if (minDollar === maxDollar) {
      const pad = Math.abs(minDollar) > 0 ? Math.abs(minDollar) * 0.2 : 1;
      minDollar -= pad;
      maxDollar += pad;
    } else {
      const pad = (maxDollar - minDollar) * 0.08;
      minDollar -= pad;
      maxDollar += pad;
    }

    const toPercent = (value: number) => (portfolioValue > 0 ? (value / portfolioValue) * 100 : 0);

    return {
      minDollar,
      maxDollar,
      minPercent: toPercent(minDollar),
      maxPercent: toPercent(maxDollar),
    };
  }, [holdingPeriodByExitData, portfolioValue]);

  const gainLossDistributionData = useMemo<HistogramDistributionEntry[]>(() => {
    const counts = HISTOGRAM_BUCKETS.reduce((acc, bin) => {
      acc[bin.key] = 0;
      return acc;
    }, {} as Record<HistogramBucketKey, number>);

    realizedExitRows.forEach((row) => {
      if (row.kind !== 'exit' || row.netCost === 0) {
        return;
      }

      const percentGain = (row.realizedGain / row.netCost) * 100;
      if (!Number.isFinite(percentGain)) {
        return;
      }

      const binKey = getBinKeyForPercent(percentGain);
      counts[binKey] += 1;
    });

    return HISTOGRAM_BUCKETS.map((bin) => ({
      binKey: bin.key,
      rangeLabel: bin.label,
      trades: counts[bin.key] ?? 0,
      bucketType: bin.bucketType,
    }));
  }, [realizedExitRows]);

  const realizedEquityDistributionData = useMemo<HistogramDistributionEntry<RealizedEquityBucketKey>[]>(() => {
    const counts = REALIZED_EQUITY_BUCKETS.reduce((acc, bin) => {
      acc[bin.key] = 0;
      return acc;
    }, {} as Record<RealizedEquityBucketKey, number>);
    const equityBase = currentBalance > 0 ? currentBalance : portfolioValue;

    realizedExitRows.forEach((row) => {
      if (equityBase <= 0) {
        return;
      }

      if (row.kind !== 'exit') {
        return;
      }
      const realizedEquityPct = (row.realizedGain / equityBase) * 100;
      if (!Number.isFinite(realizedEquityPct)) {
        return;
      }

      const binKey = getRealizedEquityBinKeyForPercent(realizedEquityPct);
      counts[binKey] += 1;
    });

    return REALIZED_EQUITY_BUCKETS.map((bin) => ({
      binKey: bin.key,
      rangeLabel: bin.label,
      trades: counts[bin.key] ?? 0,
      bucketType: bin.bucketType,
    }));
  }, [realizedExitRows, currentBalance, portfolioValue]);

  const openHistogramDrilldown = (
    histogramType: HistogramDrilldownType,
    entry: HistogramDistributionEntry<DistributionBucketKey>,
  ) => {
    setSelectedDrilldown({
      kind: 'distribution',
      histogramType,
      binKey: entry.binKey,
      rangeLabel: entry.rangeLabel,
    });
  };

  const openHoldingPeriodDrilldown = (entry: { rowId: string; rowLabel: string }) => {
    setSelectedDrilldown({
      kind: 'holdingPeriod',
      rowId: entry.rowId,
      rowLabel: entry.rowLabel,
    });
  };

  const openRealizedSymbolDrilldown = (symbol: string) => {
    setSelectedDrilldown({
      kind: 'realizedSymbol',
      symbol,
    });
  };

  const openRealizedHoldingPeriodDrilldown = (entry: { bucketKey: HoldingPeriodBucketKey; rangeLabel: string }) => {
    setSelectedDrilldown({
      kind: 'realizedHoldingPeriod',
      bucketKey: entry.bucketKey,
      rangeLabel: entry.rangeLabel,
    });
  };

  const selectedHistogramRows = useMemo<PortfolioDrilldownRow[]>(() => {
    if (!selectedDrilldown) {
      return [];
    }

    const equityBase = currentBalance > 0 ? currentBalance : portfolioValue;

    if (selectedDrilldown.kind === 'holdingPeriod') {
      const match = realizedExitRows.find((row) => row.id === selectedDrilldown.rowId);
      return match ? [match] : [];
    }

    if (selectedDrilldown.kind === 'realizedSymbol') {
      return realizedExitRows.filter((row) =>
        row.position.symbol === selectedDrilldown.symbol,
      );
    }

    if (selectedDrilldown.kind === 'realizedHoldingPeriod') {
      return realizedExitRows.filter((row) => {
        const closedDate = row.kind === 'exit' ? row.exitDate : row.position.closedDate;
        if (!closedDate) {
          return false;
        }
        const holdingDays = calculateDaysInTrade(row.position.openDate, closedDate);
        return getHoldingPeriodBucketKey(holdingDays) === selectedDrilldown.bucketKey;
      });
    }

    return realizedExitRows.filter((row) => {
      if (selectedDrilldown.histogramType === 'realizedGain') {
        if (row.kind !== 'exit' || row.netCost === 0) {
          return false;
        }
        const percentGain = (row.realizedGain / row.netCost) * 100;
        if (!Number.isFinite(percentGain)) {
          return false;
        }
        return getBinKeyForPercent(percentGain) === selectedDrilldown.binKey;
      }

      if (equityBase <= 0) {
        return false;
      }

      if (row.kind !== 'exit') {
        return false;
      }
      const realizedEquityPct = (row.realizedGain / equityBase) * 100;
      if (!Number.isFinite(realizedEquityPct)) {
        return false;
      }
      return getRealizedEquityBinKeyForPercent(realizedEquityPct) === selectedDrilldown.binKey;
    });
  }, [selectedDrilldown, realizedExitRows, currentBalance, portfolioValue]);

  const selectedHistogramTitle = useMemo(() => {
    if (!selectedDrilldown) {
      return '';
    }

    if (selectedDrilldown.kind === 'distribution') {
      return selectedDrilldown.histogramType === 'realizedGain'
        ? `Realized Gain/Loss Distribution - ${selectedDrilldown.rangeLabel}`
        : `Realized Equity Gain/Loss Distribution - ${selectedDrilldown.rangeLabel}`;
    }

    if (selectedDrilldown.kind === 'holdingPeriod') {
      return `Holding Period by Exit - ${selectedDrilldown.rowLabel}`;
    }

    if (selectedDrilldown.kind === 'realizedHoldingPeriod') {
      return `Realized Gain/Loss by Avg Holding Period - ${selectedDrilldown.rangeLabel}`;
    }

    return `Realized Gain/Loss by Symbol - ${selectedDrilldown.symbol}`;
  }, [selectedDrilldown]);
  const drilldownRealizedEquityBase = currentBalance > 0 ? currentBalance : portfolioValue;
  const statsDrilldownRows = useMemo<PortfolioDrilldownRow[]>(
    () => selectedHistogramRows,
    [selectedHistogramRows],
  );

  const realizedGainsBySymbolData = useMemo(() => {
    const gainBySymbol = new Map<string, number>();

    realizedExitRows.forEach((row) => {
      if (row.kind !== 'exit') {
        return;
      }
      gainBySymbol.set(row.position.symbol, (gainBySymbol.get(row.position.symbol) ?? 0) + row.realizedGain);
    });

    return Array.from(gainBySymbol.entries())
      .map(([symbol, realizedGain]) => ({ symbol, realizedGain }))
      .sort((a, b) => b.realizedGain - a.realizedGain);
  }, [realizedExitRows]);

  const realizedGainByAvgHoldingPeriodData = useMemo(() => {
    const totals = HOLDING_PERIOD_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.key] = 0;
      return acc;
    }, {} as Record<HoldingPeriodBucketKey, number>);

    const counts = HOLDING_PERIOD_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.key] = 0;
      return acc;
    }, {} as Record<HoldingPeriodBucketKey, number>);

    realizedExitRows.forEach((row) => {
      if (row.kind !== 'exit') {
        return;
      }

      const holdingDays = calculateDaysInTrade(row.position.openDate, row.exitDate);
      const bucketKey = getHoldingPeriodBucketKey(holdingDays);
      totals[bucketKey] += row.realizedGain;
      counts[bucketKey] += 1;
    });

    return HOLDING_PERIOD_BUCKETS.map((bucket) => ({
      bucketKey: bucket.key,
      rangeLabel: bucket.label,
      realizedGain: roundToTwoDecimals(totals[bucket.key] ?? 0),
      trades: counts[bucket.key] ?? 0,
    }));
  }, [realizedExitRows]);

  if (isLoading) {
    return <PortfolioHeroSkeleton />;
  }

  return (
    <div className="rounded-xl bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Main Hero Content */}
      <div className="p-4 md:p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            {portfolioName}
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr_1fr] gap-3 mb-3">
            <div className="rounded-xl border border-border/40 bg-background/25 dark:bg-muted/20 p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Starting Balance
              </p>
              <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight">
                {formatCurrency(portfolioValue)}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/25 dark:bg-muted/20 p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Current Balance
              </p>
              {isUnrealizedLoading ? (
                <div className="h-10 w-40 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight">
                  {formatCurrency(currentBalance)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {isUnrealizedLoading
                  ? "Calculating live balance..."
                  : portfolioValue > 0
                    ? `${currentBalancePercent >= 0 ? "+" : ""}${currentBalancePercent.toFixed(2)}% vs start`
                    : "Set starting balance to track %"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Starting + Realized</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/25 dark:bg-muted/20 p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Unrealized Balance
              </p>
              {isUnrealizedLoading ? (
                <div className="h-10 w-40 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-2xl md:text-3xl font-bold font-mono tracking-tight">
                  {formatCurrency(unrealizedBalance)}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {isUnrealizedLoading
                  ? "Calculating unrealized balance..."
                  : portfolioValue > 0
                    ? `${unrealizedBalancePercent >= 0 ? "+" : ""}${unrealizedBalancePercent.toFixed(2)}% vs start`
                    : "Set starting balance to track %"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Current + Unrealized</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 md:gap-3 mb-3">
            <div className="rounded-lg bg-muted/25 dark:bg-muted/20 p-3.5">
              <MetricCard
                label="Exposure"
                value={`${exposure.toFixed(1)}%`}
                subValue={exposure > 100 ? "Over-leveraged" : exposure > 80 ? "High" : "Normal"}
                showBar
                barValue={exposure}
                barMax={100}
                barColorClass={exposureBarColor}
                valueColorClass={exposureColorClass}
                isLoading={isUnrealizedLoading}
              />
            </div>
            <div className="rounded-lg bg-muted/25 dark:bg-muted/20 p-3.5">
              <MetricCard
                label="Total Open Risk"
                value={formatCurrency(totalOpenRisk)}
                subValue={`${riskPercent.toFixed(2)}% of portfolio`}
                showBar
                barValue={riskPercent}
                barMax={15}
                barColorClass={riskBarColor}
                valueColorClass={riskColorClass}
              />
            </div>
            <div className="rounded-lg bg-muted/25 dark:bg-muted/20 p-3.5 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Unrealized P&L
              </p>
              <div className="text-lg font-bold font-mono">
                {isUnrealizedLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <span>
                    {formatCurrency(unrealizedGain)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isUnrealizedLoading
                  ? "On remaining shares"
                  : `${unrealizedPercent >= 0 ? "+" : ""}${unrealizedPercent.toFixed(2)}% of starting balance`}
              </p>
            </div>
            <div className="rounded-lg bg-muted/25 dark:bg-muted/20 p-3.5 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Realized P&L
              </p>
              <div className="text-lg font-bold font-mono">
                <span className={cn(
                  realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrencyTwoDecimals(realizedGain)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {`${realizedPercent >= 0 ? "+" : ""}${realizedPercent.toFixed(2)}% of starting balance`}
              </p>
            </div>
          </div>

          {/* Trade Statistics (closed trades only) */}
          {tradeStatistics && (
            <div className="mt-3 rounded-xl border border-border/60 bg-background/25 dark:bg-muted/20 p-3 md:p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trade Statistics</p>
              
              {/* Top row: Batting Average, Risk/Reward, Avg Duration */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Batting Average</p>
                  <p className="text-lg font-bold font-mono">
                    {tradeStatistics.battingAverage.toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">W/L Ratio</p>
                  <p className="text-lg font-bold font-mono">
                    {tradeStatistics.riskRewardRatio > 0 ? tradeStatistics.riskRewardRatio.toFixed(2) : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Number of Trades</p>
                  <p className="text-lg font-bold font-mono">{tradeStatistics.totalClosed}</p>
                </div>
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Average R</p>
                  <p className="text-lg font-bold font-mono">{tradeStatistics.avgR.toFixed(2)}R</p>
                </div>
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Return per Trade</p>
                  <p className="text-lg font-bold font-mono">
                    {tradeStatistics.avgEquityPerTrade >= 0 ? '+' : ''}{tradeStatistics.avgEquityPerTrade.toFixed(2)}%
                  </p>
                </div>
                <div className="space-y-1 rounded-md bg-muted/20 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Average Net Cost</p>
                  <p className="text-lg font-bold font-mono">{formatCurrency(tradeStatistics.avgNetCost)}</p>
                </div>
              </div>

              {/* Gain/Loss detail grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Average Performance</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-background/30">
                          <th className="border border-border/60 px-2 py-1 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Metric
                          </th>
                          <th className="border border-border/60 px-2 py-1 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Gain
                          </th>
                          <th className="border border-border/60 px-2 py-1 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Loss
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Dollar Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{formatCurrency(tradeStatistics.avgGainDollar)}</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{formatCurrency(tradeStatistics.avgLossDollar)}</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Percent Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.avgGainPercent.toFixed(2)}%</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{tradeStatistics.avgLossPercent.toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Equity Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.avgGainEquity.toFixed(2)}%</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{tradeStatistics.avgLossEquity.toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Average Duration</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.avgWinnerDays.toFixed(1)}d</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.avgLoserDays.toFixed(1)}d</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Average R Multiple</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.avgWinnerR.toFixed(2)}R</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{tradeStatistics.avgLoserR.toFixed(2)}R</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Max Performance</p>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-background/30">
                          <th className="border border-border/60 px-2 py-1 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Metric
                          </th>
                          <th className="border border-border/60 px-2 py-1 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Gain
                          </th>
                          <th className="border border-border/60 px-2 py-1 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                            Loss
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Dollar Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{formatCurrency(tradeStatistics.maxGainDollar)}</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{formatCurrency(tradeStatistics.maxLossDollar)}</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Percent Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.maxGainPercent.toFixed(2)}%</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{tradeStatistics.maxLossPercent.toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Equity Gain</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.maxGainEquity.toFixed(2)}%</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">-{tradeStatistics.maxLossEquity.toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="border border-border/60 px-2 py-1 text-[10px] text-muted-foreground">Number of Wins/Loss</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.winnerCount}</td>
                          <td className="border border-border/60 px-2 py-1 text-right font-bold">{tradeStatistics.loserCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Balance Over Time (Realized)</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceOverTimeData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="pointLabel"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={66}
                  />
                  <YAxis
                    domain={[balanceChartDomain[0], balanceChartDomain[1]]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatAxisCurrencyTick}
                  />
                  <RechartsTooltip
                    {...chartTooltipProps}
                    formatter={(value, name, item) => {
                      const point = item?.payload as { dayRealizedGain?: number } | undefined;
                      const dayGain = point?.dayRealizedGain ?? 0;
                      return [
                        `${formatCurrencyTwoDecimals(Number(value))} (${dayGain >= 0 ? '+' : ''}${formatCurrencyTwoDecimals(dayGain)})`,
                        'Account Balance',
                      ];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Account Balance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Holding Period by Exit</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={holdingPeriodByExitData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="rowLabel"
                    tick={{ fontSize: 10 }}
                    interval={getAdaptiveXAxisInterval(holdingPeriodByExitData.length, 12)}
                    angle={-45}
                    textAnchor="end"
                    height={66}
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="pnlDollar"
                    domain={[histogramAxisDomain.minDollar, histogramAxisDomain.maxDollar]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatAxisCurrencyTick}
                  />
                  <YAxis
                    yAxisId="pnlPercent"
                    orientation="right"
                    domain={[histogramAxisDomain.minPercent, histogramAxisDomain.maxPercent]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => formatAxisPercentTick(value, 1)}
                  />
                  <RechartsTooltip
                    {...chartTooltipProps}
                    formatter={(value) => {
                      const dollarValue = Number(value);
                      const pct = portfolioValue > 0 ? (dollarValue / portfolioValue) * 100 : 0;
                      return [`${formatCurrencyTwoDecimals(dollarValue)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, 'Portfolio Gain'];
                    }}
                  />
                  <Bar
                    yAxisId="pnlDollar"
                    dataKey="totalGainLoss"
                    name="Portfolio Gain"
                    radius={[4, 4, 0, 0]}
                    onClick={(_, index) => {
                      const entry = holdingPeriodByExitData[index];
                      if (!entry) {
                        return;
                      }
                      openHoldingPeriodDrilldown(entry);
                    }}
                  >
                    {holdingPeriodByExitData.map((entry) => (
                      <Cell
                        key={`${entry.rowLabel}-pnl`}
                        cursor="pointer"
                        fill={entry.totalGainLoss >= 0 ? CHART_POSITIVE_BAR_COLOR : CHART_NEGATIVE_BAR_COLOR}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Realized Gain/Loss Distribution (%)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gainLossDistributionData} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="rangeLabel"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={66}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value) => [`${Number(value)} trades`, '# of Trades']}
                      labelFormatter={(label) => `Range: ${label}`}
                    />
                    <Bar
                      dataKey="trades"
                      name="# of Trades"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const entry = gainLossDistributionData[index];
                        if (!entry) {
                          return;
                        }
                        openHistogramDrilldown('realizedGain', entry);
                      }}
                    >
                      {gainLossDistributionData.map((entry) => (
                        <Cell
                          key={`${entry.rangeLabel}-count`}
                          cursor="pointer"
                          fill={
                            entry.bucketType === 'negative'
                              ? CHART_NEGATIVE_BAR_COLOR
                              : entry.bucketType === 'positive'
                                ? CHART_POSITIVE_BAR_COLOR
                                : CHART_NEUTRAL_BAR_COLOR
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Realized Equity Gain/Loss Distribution (%)</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realizedEquityDistributionData} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="rangeLabel"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={66}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value) => [`${Number(value)} trades`, '# of Trades']}
                      labelFormatter={(label) => `Range: ${label}`}
                    />
                    <Bar
                      dataKey="trades"
                      name="# of Trades"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const entry = realizedEquityDistributionData[index];
                        if (!entry) {
                          return;
                        }
                        openHistogramDrilldown('realizedEquity', entry);
                      }}
                    >
                      {realizedEquityDistributionData.map((entry) => (
                        <Cell
                          key={`${entry.rangeLabel}-equity-count`}
                          cursor="pointer"
                          fill={
                            entry.bucketType === 'negative'
                              ? CHART_NEGATIVE_BAR_COLOR
                              : entry.bucketType === 'positive'
                                ? CHART_POSITIVE_BAR_COLOR
                                : CHART_NEUTRAL_BAR_COLOR
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Realized Gain/Loss by Symbol</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realizedGainsBySymbolData} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="symbol"
                      tick={{ fontSize: 10 }}
                      interval={getAdaptiveXAxisInterval(realizedGainsBySymbolData.length, 14)}
                      angle={-45}
                      textAnchor="end"
                      height={68}
                      minTickGap={8}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatAxisCurrencyTick} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value) => [formatCurrencyTwoDecimals(Number(value)), 'Realized Gain/Loss']}
                      labelFormatter={(label) => `Symbol: ${label}`}
                    />
                    <Bar
                      dataKey="realizedGain"
                      name="Realized Gain/Loss"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const entry = realizedGainsBySymbolData[index];
                        if (!entry) {
                          return;
                        }
                        openRealizedSymbolDrilldown(entry.symbol);
                      }}
                    >
                      {realizedGainsBySymbolData.map((entry) => (
                        <Cell
                          key={`${entry.symbol}-realized`}
                          cursor="pointer"
                          fill={entry.realizedGain >= 0 ? CHART_POSITIVE_BAR_COLOR : CHART_NEGATIVE_BAR_COLOR}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/30 dark:bg-muted/20 p-3 md:p-4">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Realized Gain/Loss by Avg Holding Period</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realizedGainByAvgHoldingPeriodData} margin={{ top: 4, right: 8, left: 0, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="rangeLabel"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={62}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={formatAxisCurrencyTick} />
                    <RechartsTooltip
                      {...chartTooltipProps}
                      formatter={(value, _name, item) => {
                        const row = item?.payload as { trades?: number } | undefined;
                        return [`${formatCurrencyTwoDecimals(Number(value))} (${row?.trades ?? 0} positions)`, 'Realized Gain/Loss'];
                      }}
                      labelFormatter={(label) => `Holding Period: ${label}`}
                    />
                    <Bar
                      dataKey="realizedGain"
                      name="Realized Gain/Loss"
                      radius={[4, 4, 0, 0]}
                      onClick={(_, index) => {
                        const entry = realizedGainByAvgHoldingPeriodData[index];
                        if (!entry) {
                          return;
                        }
                        openRealizedHoldingPeriodDrilldown(entry);
                      }}
                    >
                      {realizedGainByAvgHoldingPeriodData.map((entry) => (
                        <Cell
                          key={`${entry.bucketKey}-holding-period`}
                          cursor="pointer"
                          fill={entry.realizedGain >= 0 ? CHART_POSITIVE_BAR_COLOR : CHART_NEGATIVE_BAR_COLOR}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

      <PortfolioDrilldownModal
        open={Boolean(selectedDrilldown)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDrilldown(null);
          }
        }}
        title={selectedHistogramTitle}
        description={`${statsDrilldownRows.length} exit row${statsDrilldownRows.length === 1 ? '' : 's'} in this bucket.`}
        rows={statsDrilldownRows}
        emptyStateMessage="No positions found for this bucket."
        realizedEquityBase={drilldownRealizedEquityBase}
      />
    </div>
  );
}

type PortfolioDrilldownRow =
  | {
      kind: 'position';
      id: string;
      position: StockPosition;
    }
  | {
      kind: 'exit';
      id: string;
      position: StockPosition;
      exitDate: Date;
      exitShares: number;
      exitPrice: number;
      realizedGain: number;
      netCost: number;
    };

function PortfolioDrilldownModal({
  open,
  onOpenChange,
  title,
  description,
  rows,
  emptyStateMessage,
  realizedEquityBase,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  rows: PortfolioDrilldownRow[];
  emptyStateMessage: string;
  realizedEquityBase: number;
}) {
  const [sortColumn, setSortColumn] = useState<string | null>('closedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterInput, setFilterInput] = useState<string>('');

  useEffect(() => {
    if (!open) {
      return;
    }
    setSortColumn('closedDate');
    setSortDirection('desc');
    setFilterInput('');
  }, [open, title]);

  const filteredPositions = useMemo(() => {
    const rawFilter = filterInput.trim();
    if (!rawFilter) {
      return rows;
    }

    const quotedMatch = rawFilter.match(/^(['"])(.*)\1$/);
    if (quotedMatch) {
      const exactSymbol = quotedMatch[2].trim().toUpperCase();
      if (!exactSymbol) {
        return rows;
      }
      return rows.filter((row) => row.position.symbol.toUpperCase() === exactSymbol);
    }

    const normalizedFilter = rawFilter.toUpperCase();
    return rows.filter((row) => row.position.symbol.toUpperCase().startsWith(normalizedFilter));
  }, [rows, filterInput]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredPositions];
    if (!sortColumn) {
      return rows;
    }

    rows.sort((a, b) => {
      const aValue = getHistogramDrilldownSortValue(a, sortColumn, realizedEquityBase);
      const bValue = getHistogramDrilldownSortValue(b, sortColumn, realizedEquityBase);

      let result = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        result = aValue - bValue;
      } else {
        result = String(aValue).localeCompare(String(bValue), undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? result : -result;
    });
    return rows;
  }, [filteredPositions, sortColumn, sortDirection, realizedEquityBase]);

  const realizedGainTotal = useMemo(
    () => sortedRows.reduce((sum, row) => sum + getDrilldownRowRealizedGain(row), 0),
    [sortedRows],
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
      return;
    }
    setSortColumn(column);
    setSortDirection('desc');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {filterInput.trim() ? ` Showing ${sortedRows.length} after filter.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <Input
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value.toUpperCase())}
            placeholder="Filter"
            aria-label="Filter drilldown positions by symbol"
            className="h-8 w-full text-xs bg-background/50 sm:w-[320px]"
          />
        </div>
        <div className="max-h-[70vh] overflow-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
          <Table>
            <TableHeader className="sticky top-0 z-30 bg-background [&_th]:bg-background [&_th]:border-b [&_th]:border-border">
              <TableRow className="border-b-2">
                {HISTOGRAM_DRILLDOWN_COLUMNS.map((column) => (
                  <SortableHeader
                    key={column.id}
                    column={column.id}
                    label={column.label}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className={cn(column.id === 'symbol' ? 'sticky left-0 z-30 !bg-background border-r border-border' : 'border-r', column.id === HISTOGRAM_DRILLDOWN_COLUMNS[HISTOGRAM_DRILLDOWN_COLUMNS.length - 1]?.id && 'border-r-0')}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.length > 0 ? (
                sortedRows.map((row) => {
                  return (
                    <TableRow key={row.id} className="border-b even:bg-muted/20 hover:bg-muted/40 transition-colors">
                      {HISTOGRAM_DRILLDOWN_COLUMNS.map((column) => (
                        <TableCell
                          key={`${row.id}-${column.id}`}
                          className={cn(
                            column.id === 'symbol'
                              ? 'font-medium border-r font-mono sticky left-0 z-20 !bg-background'
                              : 'border-r font-mono',
                            column.id === HISTOGRAM_DRILLDOWN_COLUMNS[HISTOGRAM_DRILLDOWN_COLUMNS.length - 1]?.id && 'border-r-0',
                          )}
                        >
                          {renderHistogramDrilldownCell(
                            column.id,
                            row,
                            realizedEquityBase,
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={HISTOGRAM_DRILLDOWN_COLUMNS.length}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    {emptyStateMessage}
                  </TableCell>
                </TableRow>
              )}
              {sortedRows.length > 0 && (
                <TableRow className="border-t-2 bg-muted/20">
                  {HISTOGRAM_DRILLDOWN_COLUMNS.map((column) => (
                    <TableCell
                      key={`summary-${column.id}`}
                      className={cn(
                        column.id === 'symbol'
                          ? 'font-semibold border-r font-mono sticky left-0 z-20 !bg-background'
                          : 'border-r font-mono',
                        column.id === HISTOGRAM_DRILLDOWN_COLUMNS[HISTOGRAM_DRILLDOWN_COLUMNS.length - 1]?.id && 'border-r-0',
                      )}
                    >
                      {column.id === 'symbol' ? (
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">Summary</span>
                      ) : column.id === 'realizedGain' ? (
                        <span className={cn('font-semibold', realizedGainTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400')}>
                          {formatCurrency(realizedGainTotal)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PortfolioCalendarTab({
  positions,
  portfolioValue,
  isLoading,
}: {
  positions: StockPosition[];
  portfolioValue: number;
  isLoading: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => normalizeToLocalMidnight(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    for (let i = 0; i < 42; i += 1) {
      days.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
    }
    return days;
  }, [currentMonth]);

  const dayEventsMap = useMemo(() => {
    const map = new Map<string, {
      date: Date;
      dayRealizedGain: number;
      exitRows: PortfolioDrilldownRow[];
    }>();

    const getOrCreateDay = (date: Date) => {
      const normalized = normalizeToLocalMidnight(date);
      const key = format(normalized, 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) {
        return { key, bucket: existing };
      }

      const created = {
        date: normalized,
        dayRealizedGain: 0,
        exitRows: [] as PortfolioDrilldownRow[],
      };
      map.set(key, created);
      return { key, bucket: created };
    };

    positions.forEach((position) => {
      position.exits.forEach((exit) => {
        if (!exit.exitDate) {
          return;
        }
        const realizedGain = calculateGainLoss(
          exit.price,
          position.cost,
          exit.shares,
          position.type,
        );
        if (realizedGain === 0) {
          return;
        }
        const exitDay = getOrCreateDay(exit.exitDate);
        exitDay.bucket.dayRealizedGain += realizedGain;
        exitDay.bucket.exitRows.push({
          kind: 'exit',
          id: `${position.id}-exit-${exit.id}`,
          position,
          exitDate: exit.exitDate,
          exitShares: exit.shares,
          exitPrice: exit.price,
          realizedGain,
          netCost: position.cost * exit.shares,
        });
      });
    });

    return map;
  }, [positions]);

  const selectedDayEntry = useMemo(() => {
    if (!selectedDayKey) {
      return null;
    }
    const entry = dayEventsMap.get(selectedDayKey);
    if (!entry) {
      return null;
    }
    return {
      ...entry,
      rows: entry.exitRows,
      exitCount: entry.exitRows.length,
    };
  }, [selectedDayKey, dayEventsMap]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const totalRealizedGain = useMemo(
    () => positions.reduce((sum, position) => sum + calculateRealizedGainForPosition(position), 0),
    [positions],
  );
  const realizedEquityBase = portfolioValue + totalRealizedGain > 0 ? portfolioValue + totalRealizedGain : portfolioValue;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/80 p-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 overflow-hidden">
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Portfolio Activity Calendar</h3>
            <p className="text-xs text-muted-foreground">
              Click a day to view realized exits on that date.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm font-medium">{format(currentMonth, 'MMMM yyyy')}</p>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {weekDays.map((day) => (
            <div key={day} className="px-2 py-1 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const normalized = normalizeToLocalMidnight(day);
            const key = format(normalized, 'yyyy-MM-dd');
            const dayEntry = dayEventsMap.get(key);
            const isCurrentMonth = normalized.getMonth() === currentMonth.getMonth();
            const isToday = normalized.getTime() === normalizeToLocalMidnight(new Date()).getTime();
            const totalEvents = dayEntry?.exitRows.length ?? 0;
            const hasEvents = totalEvents > 0;

            return (
              <button
                type="button"
                key={key}
                className={cn(
                  "min-h-[92px] rounded-md border border-border/40 bg-background p-2 text-left transition-colors",
                  !isCurrentMonth && "opacity-35",
                  isToday && "ring-1 ring-primary/40",
                  hasEvents ? "hover:bg-muted/35" : "cursor-default",
                )}
                onClick={() => {
                  if (!hasEvents) {
                    return;
                  }
                  setSelectedDayKey(key);
                }}
              >
                <div className={cn("text-xs font-medium", isToday && "text-primary")}>
                  {normalized.getDate()}
                </div>
                {hasEvents && (
                  <div className="mt-2 text-[10px]">
                    <div
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium",
                        (dayEntry?.dayRealizedGain ?? 0) > 0
                          ? "bg-green-500/10 text-green-700 dark:text-green-300"
                          : (dayEntry?.dayRealizedGain ?? 0) < 0
                            ? "bg-red-500/10 text-red-700 dark:text-red-300"
                            : "bg-muted/60 text-muted-foreground",
                      )}
                    >
                      {formatCurrency(dayEntry?.dayRealizedGain ?? 0)}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <PortfolioDrilldownModal
        open={Boolean(selectedDayEntry)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDayKey(null);
          }
        }}
        title={selectedDayEntry ? `Calendar Activity - ${format(selectedDayEntry.date, 'MMM dd, yyyy')}` : 'Calendar Activity'}
        description={
          selectedDayEntry
            ? `${selectedDayEntry.exitCount} realized exit${selectedDayEntry.exitCount === 1 ? '' : 's'}`
            : 'No day selected.'
        }
        rows={selectedDayEntry?.rows ?? []}
        emptyStateMessage="No positions found for this day."
        realizedEquityBase={realizedEquityBase}
      />
    </div>
  );
}

// Collapsible Panel Component
type PortfolioTableRow =
  | { kind: 'position'; position: StockPosition }
  | {
      kind: 'summary';
      symbol: string;
      typeLabel: string;
      quantity: number;
      remainingShares: number;
      netCost: number;
      weightedCost: number;
      realizedGain: number;
      positions: StockPosition[];
    };

const getDrilldownRowRealizedGain = (row: PortfolioDrilldownRow) =>
  row.kind === 'exit' ? row.realizedGain : calculateRealizedGainForPosition(row.position);

const getDrilldownRowQuantity = (row: PortfolioDrilldownRow) =>
  row.kind === 'exit' ? row.exitShares : row.position.quantity;

const getDrilldownRowNetCost = (row: PortfolioDrilldownRow) =>
  row.kind === 'exit' ? row.netCost : row.position.netCost;

const getDrilldownRowClosedDate = (row: PortfolioDrilldownRow) =>
  row.kind === 'exit' ? row.exitDate : row.position.closedDate;

const getDrilldownRowRMultiple = (row: PortfolioDrilldownRow): number | null => {
  if (row.kind === 'position') {
    return calculateDisplayedRMultipleForPosition(row.position);
  }

  if (!hasConfiguredStopLoss(row.position.cost, row.position.initialStopLoss)) {
    return null;
  }

  const initialRiskPerShare = Math.abs(row.position.cost - row.position.initialStopLoss);
  const rowInitialRisk = initialRiskPerShare * row.exitShares;
  if (rowInitialRisk <= 0) {
    return null;
  }

  return row.realizedGain / rowInitialRisk;
};

function getHistogramDrilldownSortValue(
  row: PortfolioDrilldownRow,
  columnId: string,
  realizedEquityBase: number,
): number | string {
  const position = row.position;
  const realizedGainValue = getDrilldownRowRealizedGain(row);
  const rowQuantity = getDrilldownRowQuantity(row);
  const rowNetCost = getDrilldownRowNetCost(row);
  const rowClosedDate = getDrilldownRowClosedDate(row);
  switch (columnId) {
    case 'symbol':
      return position.symbol.toUpperCase();
    case 'type':
      return position.type;
    case 'quantity':
      return rowQuantity;
    case 'cost':
      return position.cost;
    case 'netCost':
      return rowNetCost;
    case 'stopLoss':
      return position.stopLoss;
    case 'realizedGain':
      return realizedGainValue;
    case 'realizedPercent':
      return rowNetCost !== 0 ? (realizedGainValue / rowNetCost) * 100 : Number.NEGATIVE_INFINITY;
    case 'realizedEquityPercent':
      return realizedEquityBase > 0 && Number.isFinite(realizedEquityBase)
        ? (realizedGainValue / realizedEquityBase) * 100
        : Number.NEGATIVE_INFINITY;
    case 'rMultiple': {
      const rMultiple = getDrilldownRowRMultiple(row);
      return rMultiple ?? Number.NEGATIVE_INFINITY;
    }
    case 'openDate':
      return position.openDate.getTime();
    case 'closedDate':
      return rowClosedDate ? rowClosedDate.getTime() : Number.NEGATIVE_INFINITY;
    case 'holdingPeriod':
      return rowClosedDate ? calculateDaysInTrade(position.openDate, rowClosedDate) : Number.NEGATIVE_INFINITY;
    default:
      return '';
  }
}

function renderHistogramDrilldownCell(
  columnId: string,
  row: PortfolioDrilldownRow,
  realizedEquityBase: number,
) {
  const position = row.position;
  const realizedGain = getDrilldownRowRealizedGain(row);
  const rowNetCost = getDrilldownRowNetCost(row);
  const rowClosedDate = getDrilldownRowClosedDate(row);
  const realizedPercent = rowNetCost !== 0 ? (realizedGain / rowNetCost) * 100 : null;
  const realizedEquityPercent = realizedEquityBase > 0 ? (realizedGain / realizedEquityBase) * 100 : null;
  const rowRMultiple = getDrilldownRowRMultiple(row);

  switch (columnId) {
    case 'symbol':
      return position.symbol;
    case 'type':
      return (
        <span
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            position.type === 'Long'
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : 'bg-red-500/20 text-red-400',
          )}
        >
          {position.type}
        </span>
      );
    case 'quantity':
      return getDrilldownRowQuantity(row);
    case 'cost':
      return <span className="font-medium">{formatCurrency(position.cost)}</span>;
    case 'netCost':
      return <span className="font-medium">{formatCurrency(rowNetCost)}</span>;
    case 'stopLoss':
      return <span className="font-medium">{formatCurrency(position.stopLoss)}</span>;
    case 'realizedGain':
      return (
        <span className={cn('font-medium', realizedGain >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400')}>
          {formatCurrency(realizedGain)}
        </span>
      );
    case 'realizedPercent':
      return realizedPercent === null || !Number.isFinite(realizedPercent) ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span className={cn('font-medium', getSignedPercentColorClass(realizedPercent))}>
          {formatSignedPercent(realizedPercent)}
        </span>
      );
    case 'realizedEquityPercent':
      return realizedEquityPercent === null || !Number.isFinite(realizedEquityPercent) ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span className={cn('font-medium', getSignedPercentColorClass(realizedEquityPercent))}>
          {formatSignedPercent(realizedEquityPercent)}
        </span>
      );
    case 'rMultiple':
      return row.kind === 'position' ? (
        <RMultipleCell symbol={position.symbol} positions={[position]} />
      ) : rowRMultiple === null ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span className={cn('font-medium', rowRMultiple >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-400')}>
          {`${rowRMultiple.toFixed(2)}R`}
        </span>
      );
    case 'openDate':
      return format(position.openDate, 'MM/dd/yy');
    case 'closedDate':
      return rowClosedDate ? format(rowClosedDate, 'MM/dd/yy') : <span className="text-muted-foreground">-</span>;
    case 'holdingPeriod': {
      if (!rowClosedDate) {
        return <span className="text-muted-foreground">-</span>;
      }
      const daysHeld = calculateDaysInTrade(position.openDate, rowClosedDate);
      return <span className="font-medium tabular-nums">{`${daysHeld}d`}</span>;
    }
    default:
      return '-';
  }
}

// Component to display equity (quantity × price)
function EquityCell({ 
  symbol, 
  quantity 
}: { 
  symbol: string; 
  quantity: number; 
}) {
  const { data: quote, isLoading, error } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">N/A</span>
      </div>
    );
  }

  const equity = quote.price * quantity;

  return (
    <span className="font-medium">{formatCurrency(equity)}</span>
  );
}

// SortableHeader is now imported from @/components/ui/SortableHeader

// Component to calculate and display summary totals for equity and gain/loss
function SummaryTotalsRow({ 
  positions,
  portfolioValue,
  summaryTotals,
  visibleColumns,
}: { 
  positions: StockPosition[];
  portfolioValue: number;
  summaryTotals: {
    quantity: number;
    remainingShares: number;
    netCost: number;
    realizedGain: number;
  };
  visibleColumns: TableColumnDef[];
}) {
  const closedPositions = useMemo(
    () => positions.filter((position) => isPositionFullyClosed(position)),
    [positions],
  );

  const openPositions = useMemo(
    () => positions.filter((position) => !isPositionFullyClosed(position) && getRemainingShares(position) > 0),
    [positions],
  );

  const quoteQueries = useQueries({
    queries: openPositions.map((position) => quoteQueryOptions(position.symbol)),
  });

  const isLoading = quoteQueries.some((query) => query.isLoading);

  const totals = useMemo(() => {
    let equity = 0;
    let gainLoss = 0;
    let portfolioGainDollar = 0;
    let totalInitialRisk = 0;
    let totalDisplayedGain = 0;

    for (const position of closedPositions) {
      const realizedGain = calculateRealizedGainForPosition(position);
      gainLoss += realizedGain;
      portfolioGainDollar += realizedGain;
      totalDisplayedGain += realizedGain;
      totalInitialRisk += calculateInitialRiskForPosition(position);
    }

    for (let index = 0; index < openPositions.length; index += 1) {
      const position = openPositions[index];
      const currentPrice = quoteQueries[index]?.data?.price;
      const markPrice = typeof currentPrice === 'number' ? currentPrice : position.cost;
      const remaining = getRemainingShares(position);

      equity += markPrice * remaining;
      gainLoss += calculateGainLoss(markPrice, position.cost, remaining, position.type);
      const projectedGain = calculateProjectedGainForPosition(position, markPrice);
      portfolioGainDollar += projectedGain;
      totalDisplayedGain += projectedGain;
      totalInitialRisk += calculateInitialRiskForPosition(position);
    }

    const rMultiple = totalInitialRisk > 0 ? totalDisplayedGain / totalInitialRisk : 0;
    return { equity, gainLoss, portfolioGainDollar, rMultiple };
  }, [closedPositions, openPositions, quoteQueries]);

  const totalPortfolioPercent = portfolioValue > 0
    ? (totals.equity / portfolioValue) * 100
    : 0;

  return (
    <TableRow className="bg-muted/50 font-bold border-t-2">
      {visibleColumns.map((col) => {
        const baseClass = col.isAnchor
          ? "border-r sticky left-0 z-20 !bg-background"
          : col.id === 'actions'
            ? ""
            : "border-r";

        if (col.id === 'symbol') {
          return <TableCell key={col.id} className={baseClass}>Total</TableCell>;
        }
        if (col.id === 'quantity') {
          return <TableCell key={col.id} className={baseClass}>{summaryTotals.quantity}</TableCell>;
        }
        if (col.id === 'remainingShares') {
          return <TableCell key={col.id} className={cn(baseClass, "text-center")}>{summaryTotals.remainingShares ?? 0}</TableCell>;
        }
        if (col.id === 'netCost') {
          return <TableCell key={col.id} className={cn(baseClass, "font-medium")}>{formatCurrency(summaryTotals.netCost)}</TableCell>;
        }
        if (col.id === 'equity') {
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              {isLoading ? <div className="h-4 w-16 bg-muted animate-pulse rounded"></div> : formatCurrency(totals.equity)}
            </TableCell>
          );
        }
        if (col.id === 'gainLoss') {
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              {isLoading ? (
                <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
              ) : (
                <span className={cn(
                  totals.gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {formatCurrency(totals.gainLoss)}
                </span>
              )}
            </TableCell>
          );
        }
        if (col.id === 'portfolioGain') {
          const totalPortfolioGainPercent = portfolioValue > 0 ? (totals.portfolioGainDollar / portfolioValue) * 100 : 0;
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              {isLoading ? (
                <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
              ) : (
                <span className={cn(totalPortfolioGainPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                  {`${totalPortfolioGainPercent >= 0 ? '+' : ''}${totalPortfolioGainPercent.toFixed(2)}%`}
                </span>
              )}
            </TableCell>
          );
        }
        if (col.id === 'realizedGain') {
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              <span className={cn(
                summaryTotals.realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {formatCurrency(summaryTotals.realizedGain)}
              </span>
            </TableCell>
          );
        }
        if (col.id === 'rMultiple') {
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              {`${totals.rMultiple.toFixed(2)}R`}
            </TableCell>
          );
        }
        if (col.id === 'portfolioPercent') {
          return (
            <TableCell key={col.id} className={cn(baseClass, "font-medium")}>
              {isLoading ? <div className="h-4 w-16 bg-muted animate-pulse rounded"></div> : `${totalPortfolioPercent.toFixed(2)}%`}
            </TableCell>
          );
        }
        if (col.id === 'actions') {
          return <TableCell key={col.id} className={baseClass}></TableCell>;
        }
        return <TableCell key={col.id} className={baseClass}>-</TableCell>;
      })}
    </TableRow>
  );
}

// Component to display portfolio percentage
function PortfolioPercentCell({ 
  symbol, 
  quantity,
  portfolioValue
}: { 
  symbol: string; 
  quantity: number;
  portfolioValue: number;
}) {
  const { data: quote, isLoading, error } = useQuote(symbol);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  if (error || !quote || portfolioValue === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">N/A</span>
      </div>
    );
  }

  const equity = quote.price * quantity;
  const percentage = (equity / portfolioValue) * 100;

  return (
    <span className={cn(
      "font-medium",
      percentage > 20 ? "text-orange-600 dark:text-orange-400" : 
      percentage > 10 ? "text-yellow-600 dark:text-yellow-400" : ""
    )}>
      {percentage.toFixed(2)}%
    </span>
  );
}

function PortfolioGainCell({
  symbol,
  positions,
  portfolioValue,
}: {
  symbol: string;
  positions: StockPosition[];
  portfolioValue: number;
}) {
  const { data: quote, isLoading } = useQuote(symbol);
  const isOpen = positions.some((position) => !isPositionFullyClosed(position) && getRemainingShares(position) > 0);

  const totalGain = useMemo(() => {
    return positions.reduce((sum, position) => {
      const currentPrice = isOpen ? quote?.price : undefined;
      return sum + calculateProjectedGainForPosition(position, currentPrice);
    }, 0);
  }, [isOpen, positions, quote?.price]);

  if (portfolioValue <= 0) {
    return <span className="text-muted-foreground text-sm">N/A</span>;
  }

  if (isOpen && isLoading) {
    return <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>;
  }

  const gainPercent = (totalGain / portfolioValue) * 100;
  return (
    <span className={cn("font-medium", gainPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
      {`${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(2)}%`}
    </span>
  );
}

function RMultipleCell({
  symbol,
  positions,
}: {
  symbol: string;
  positions: StockPosition[];
}) {
  const { data: quote, isLoading } = useQuote(symbol);
  const isOpen = positions.some((position) => !isPositionFullyClosed(position) && getRemainingShares(position) > 0);

  const rValue = useMemo(() => {
    const totalInitialRisk = positions.reduce((sum, position) => sum + calculateInitialRiskForPosition(position), 0);
    if (totalInitialRisk <= 0) {
      return 0;
    }

    const totalGain = positions.reduce((sum, position) => {
      const currentPrice = isOpen ? quote?.price : undefined;
      return sum + calculateProjectedGainForPosition(position, currentPrice);
    }, 0);

    return totalGain / totalInitialRisk;
  }, [isOpen, positions, quote?.price]);

  if (isOpen && isLoading) {
    return <div className="h-4 w-12 bg-muted animate-pulse rounded" />;
  }

  return (
    <span className={cn("font-medium", isOpen ? "text-orange-600 dark:text-orange-400" : "")}>
      {`${rValue.toFixed(2)}R`}
    </span>
  );
}

export default function Portfolio() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    portfolio,
    portfolios,
    selectedPortfolioKey,
    positions,
    isLoading: isPortfolioLoading,
    error: portfolioError,
    defaultPortfolioKey,
    selectPortfolio,
    addPosition,
    updatePosition,
    deletePosition,
    updatePortfolio,
    createPortfolio,
    setPortfolioAsDefault,
    addExit,
    updateExit,
    deleteExit,
    setPortfolioRetired,
  } = usePortfolio();

  const isPortfolioRetired = Boolean(portfolio?.is_retired);

  const [portfolioValue, setPortfolioValue] = useState<string>('');
  const [portfolioName, setPortfolioName] = useState<string>('My Portfolio');
  const [symbol, setSymbol] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [positionInstrument, setPositionInstrument] = useState<'stock' | 'option'>('stock');
  const [initialStopLoss, setInitialStopLoss] = useState<string>('');
  const [type, setType] = useState<'Long' | 'Short'>('Long');
  const [openDate, setOpenDate] = useState<Date>(new Date());
  
  // Portfolio overview edit state
  const [showEditPortfolioDialog, setShowEditPortfolioDialog] = useState(false);
  const [tempPortfolioName, setTempPortfolioName] = useState<string>('');
  const [tempPortfolioValue, setTempPortfolioValue] = useState<string>('');
  const [isSavingPortfolio, setIsSavingPortfolio] = useState(false);
  
  // Sorting + column settings state
  const {
    sortColumn,
    sortDirection,
    handleSort,
    visibleColumns,
    hiddenColumns,
    toggleColumn,
    reorderColumns,
    resetColumnsToDefaults,
    orderedColumns,
  } = useSortableTable({
    defaultColumn: 'closedDate',
    defaultDirection: 'desc',
    columns: PORTFOLIO_COLUMNS,
    tableId: 'portfolio-table',
    enableClearSort: true,
  });
  
  // Delete confirmation state
  const [positionToDelete, setPositionToDelete] = useState<StockPosition | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Filter state
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [summarizeOpenPositions, setSummarizeOpenPositions] = useState(false);
  const [symbolFilterInput, setSymbolFilterInput] = useState<string>('');
  
  // Edit state
  const [editingPosition, setEditingPosition] = useState<StockPosition | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Chart modal state
  const [chartPosition, setChartPosition] = useState<StockPosition | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);

  const [isPositionsSidebarCollapsed, setIsPositionsSidebarCollapsed] = useState(false);

  // Create Portfolio state
  const [showCreatePortfolioDialog, setShowCreatePortfolioDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState<string>('');
  const [newPortfolioValue, setNewPortfolioValue] = useState<string>('');
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
  const [showRetireDialog, setShowRetireDialog] = useState(false);
  const [isTogglingRetired, setIsTogglingRetired] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioTab>(() => readStoredSelectedPortfolioTab(user?.id));

  // Initialize portfolio value and name from database
  useEffect(() => {
    if (portfolio) {
      setPortfolioValue(portfolio.portfolio_value.toString());
      setPortfolioName(portfolio.portfolio_name || 'My Portfolio');
    }
  }, [portfolio]);

  useEffect(() => {
    setActiveTab(readStoredSelectedPortfolioTab(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const suffix = user?.id ? `:${user.id}` : '';
      window.localStorage.setItem(`${SELECTED_PORTFOLIO_TAB_STORAGE_KEY}${suffix}`, activeTab);
    } catch {
      // Ignore storage write errors
    }
  }, [activeTab, user?.id]);

  const handleAddStock = async () => {
    if (isPortfolioRetired) {
      return;
    }

    if (!symbol.trim() || !cost.trim() || !quantity.trim()) {
      return;
    }

    const costValue = parseFloat(cost);
    const enteredQuantity = parseFloat(quantity);
    const isOptionPosition = positionInstrument === 'option';
    const quantityValue = isOptionPosition ? enteredQuantity * 100 : enteredQuantity;
    const stopLossInput = parseFloat(initialStopLoss);
    const stopLossValue =
      !Number.isNaN(stopLossInput) && stopLossInput > 0
        ? stopLossInput
        : 0;
    if (
      Number.isNaN(costValue) ||
      Number.isNaN(quantityValue) ||
      costValue <= 0 ||
      quantityValue <= 0 ||
      (!isOptionPosition && stopLossValue <= 0)
    ) {
      return;
    }
    const netCost = costValue * quantityValue;

    const newPosition: Omit<StockPosition, 'id' | 'exits' | 'realizedGain'> = {
      symbol: symbol.trim().toUpperCase(),
      cost: costValue,
      quantity: quantityValue,
      netCost: netCost,
      initialStopLoss: stopLossValue,
      stopLoss: stopLossValue,
      type: type,
      openDate: openDate,
      closedDate: null,
    };

    try {
      await addPosition(newPosition);
      
      // Clear form
      setSymbol('');
      setCost('');
      setQuantity('');
      setInitialStopLoss('');
      setPositionInstrument('stock');
      setType('Long');
      setOpenDate(new Date());
    } catch (error) {
      console.error('Failed to add position:', error);
      // You could add a toast notification here
    }
  };

  const isAddButtonDisabled =
    isPortfolioRetired ||
    isPortfolioLoading ||
    !portfolio ||
    !symbol.trim() ||
    !cost.trim() ||
    !quantity.trim() ||
    (positionInstrument !== 'option' && !initialStopLoss.trim());


  // Edit functions
  const handleEditPosition = (position: StockPosition) => {
    console.log('Opening edit modal for:', position.symbol);
    setEditingPosition(position);
    setShowEditModal(true);
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setShowEditModal(false);
  };

  const handleDeletePosition = (position: StockPosition) => {
    if (isPortfolioRetired) {
      return;
    }

    setPositionToDelete(position);
    setShowDeleteDialog(true);
  };

  const confirmDeletePosition = async () => {
    if (isPortfolioRetired || !positionToDelete) return;
    
    try {
      await deletePosition(positionToDelete.id);
      setShowDeleteDialog(false);
      setPositionToDelete(null);
    } catch (error) {
      console.error('Failed to delete position:', error);
      // You could add a toast notification here
    }
  };

  const cancelDeletePosition = () => {
    setShowDeleteDialog(false);
    setPositionToDelete(null);
  };

  const handleEditPortfolio = () => {
    setTempPortfolioName(portfolioName);
    setTempPortfolioValue(portfolioValue);
    setShowEditPortfolioDialog(true);
  };

  const handleSavePortfolio = async () => {
    const name = tempPortfolioName.trim();
    if (!name) {
      return;
    }

    const numValue = parseFloat(tempPortfolioValue) || 0;
    setIsSavingPortfolio(true);
    try {
      await updatePortfolio(name, numValue);
      setPortfolioName(name);
      setPortfolioValue(tempPortfolioValue);
      setShowEditPortfolioDialog(false);
    } catch (error) {
      console.error('Failed to update portfolio:', error);
    } finally {
      setIsSavingPortfolio(false);
    }
  };

  const handleCancelPortfolioEdit = () => {
    setShowEditPortfolioDialog(false);
    setTempPortfolioName(portfolioName);
    setTempPortfolioValue(portfolioValue);
  };

  const handleRetireClick = () => {
    setShowRetireDialog(true);
  };

  const handleConfirmRetireToggle = async () => {
    setIsTogglingRetired(true);
    try {
      await setPortfolioRetired(!isPortfolioRetired);
      setShowRetireDialog(false);
      setShowEditModal(false);
      setEditingPosition(null);
    } catch (error) {
      console.error('Failed to toggle portfolio retired status:', error);
    } finally {
      setIsTogglingRetired(false);
    }
  };

  // Create Portfolio handlers
  const handleOpenCreatePortfolio = () => {
    setNewPortfolioName('');
    setNewPortfolioValue('');
    setShowCreatePortfolioDialog(true);
  };

  const handleCreatePortfolio = async () => {
    const name = newPortfolioName.trim();
    const value = parseFloat(newPortfolioValue) || 0;

    if (!name) {
      return; // Don't create portfolio without a name
    }

    setIsCreatingPortfolio(true);
    try {
      await createPortfolio(name, value);
      setShowCreatePortfolioDialog(false);
      setNewPortfolioName('');
      setNewPortfolioValue('');
    } catch (error) {
      console.error('Failed to create portfolio:', error);
      // You could add a toast notification here
    } finally {
      setIsCreatingPortfolio(false);
    }
  };

  const handleCancelCreatePortfolio = () => {
    setShowCreatePortfolioDialog(false);
    setNewPortfolioName('');
    setNewPortfolioValue('');
  };

  // handleSort is provided by useSortableTable hook

  const filteredPositions = useMemo(() => {
    const rawFilter = symbolFilterInput.trim();
    if (!rawFilter) {
      return positions;
    }

    const quotedMatch = rawFilter.match(/^(['"])(.*)\1$/);
    if (quotedMatch) {
      const exactSymbol = quotedMatch[2].trim().toUpperCase();
      if (!exactSymbol) {
        return positions;
      }
      return positions.filter((pos) => pos.symbol.toUpperCase() === exactSymbol);
    }

    const normalizedFilter = rawFilter.toUpperCase();

    // Prefix-only filter (e.g., "MU" matches "MU..." but not "ALMU")
    return positions.filter((pos) => 
      pos.symbol.toUpperCase().startsWith(normalizedFilter)
    );
  }, [positions, symbolFilterInput]);

  const sortQuoteSymbols = useMemo(
    () => Array.from(new Set(filteredPositions.map((position) => position.symbol))),
    [filteredPositions],
  );

  const sortQuoteQueries = useQueries({
    queries: sortQuoteSymbols.map((symbol) => quoteQueryOptions(symbol)),
  });

  const sortQuotePriceBySymbol = useMemo(() => {
    const priceMap = new Map<string, number>();
    sortQuoteSymbols.forEach((symbol, index) => {
      const price = sortQuoteQueries[index]?.data?.price;
      if (typeof price === 'number') {
        priceMap.set(symbol, price);
      }
    });
    return priceMap;
  }, [sortQuoteSymbols, sortQuoteQueries]);

  const canSummarizeOpenPositions = useMemo(() => {
    const symbolCounts = new Map<string, number>();
    for (const position of filteredPositions) {
      if (isPositionFullyClosed(position)) continue;
      symbolCounts.set(position.symbol, (symbolCounts.get(position.symbol) ?? 0) + 1);
      if ((symbolCounts.get(position.symbol) ?? 0) > 1) {
        return true;
      }
    }
    return false;
  }, [filteredPositions]);

  // Sort positions
  const sortedPositions = useMemo(() => {
    const basePositions = [...filteredPositions];
    const parsedPortfolioValue = parseFloat(portfolioValue);
    const currentPortfolioValue = !Number.isNaN(parsedPortfolioValue)
      ? parsedPortfolioValue
      : (portfolio?.portfolio_value || 0);

    const getMarkPrice = (position: StockPosition) =>
      sortQuotePriceBySymbol.get(position.symbol) ?? position.currentPrice ?? position.cost;

    const getPositionGainLossSortValue = (position: StockPosition) => {
      if (isPositionFullyClosed(position)) {
        return calculateRealizedGainForPosition(position);
      }

      return calculateGainLoss(getMarkPrice(position), position.cost, getRemainingShares(position), position.type);
    };

    const getOpenRiskSortValue = (position: StockPosition): number | null => {
      if (position.closedDate) {
        return 0;
      }

      if (!hasConfiguredStopLoss(position.cost, position.stopLoss)) {
        return null;
      }

      return calculatePercentageChange(position.stopLoss, position.cost);
    };

    const getPortfolioPercentSortValue = (position: StockPosition): number | null => {
      if (currentPortfolioValue <= 0) {
        return null;
      }

      return (getMarkPrice(position) * getRemainingShares(position) / currentPortfolioValue) * 100;
    };

    const compareSortValues = (aValue: number | string | null, bValue: number | string | null): number => {
      const aMissing = aValue === null || aValue === '';
      const bMissing = bValue === null || bValue === '';
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      const valueCompare = typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' });

      return sortDirection === 'asc' ? valueCompare : -valueCompare;
    };

    if (!sortColumn) {
      return basePositions;
    }

    basePositions.sort((a, b) => {
      let aValue: number | string | null = 0;
      let bValue: number | string | null = 0;

      switch (sortColumn) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'price':
          aValue = getMarkPrice(a);
          bValue = getMarkPrice(b);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'remainingShares':
          aValue = getRemainingShares(a);
          bValue = getRemainingShares(b);
          break;
        case 'netCost':
          aValue = a.netCost;
          bValue = b.netCost;
          break;
        case 'equity':
          aValue = getMarkPrice(a) * getRemainingShares(a);
          bValue = getMarkPrice(b) * getRemainingShares(b);
          break;
        case 'gainLoss':
          aValue = getPositionGainLossSortValue(a);
          bValue = getPositionGainLossSortValue(b);
          break;
        case 'portfolioGain':
          aValue = currentPortfolioValue > 0
            ? (calculateProjectedGainForPosition(a, getMarkPrice(a)) / currentPortfolioValue) * 100
            : null;
          bValue = currentPortfolioValue > 0
            ? (calculateProjectedGainForPosition(b, getMarkPrice(b)) / currentPortfolioValue) * 100
            : null;
          break;
        case 'realizedGain':
          aValue = a.realizedGain || 0;
          bValue = b.realizedGain || 0;
          break;
        case 'rMultiple':
          aValue = calculateDisplayedRMultipleForPosition(a, getMarkPrice(a));
          bValue = calculateDisplayedRMultipleForPosition(b, getMarkPrice(b));
          break;
        case 'portfolioPercent':
          aValue = getPortfolioPercentSortValue(a);
          bValue = getPortfolioPercentSortValue(b);
          break;
        case 'initialStopLoss':
          aValue = a.initialStopLoss;
          bValue = b.initialStopLoss;
          break;
        case 'stopLoss':
          aValue = a.stopLoss;
          bValue = b.stopLoss;
          break;
        case 'openRisk':
          aValue = getOpenRiskSortValue(a);
          bValue = getOpenRiskSortValue(b);
          break;
        case 'openHeat':
          aValue = getOpenHeatPercent(a, currentPortfolioValue);
          bValue = getOpenHeatPercent(b, currentPortfolioValue);
          break;
        case 'openDate':
          aValue = a.openDate.getTime();
          bValue = b.openDate.getTime();
          break;
        case 'closedDate':
          aValue = a.closedDate?.getTime() ?? null;
          bValue = b.closedDate?.getTime() ?? null;
          break;
        case 'daysInTrade':
          const now = new Date();
          const aEndDate = a.closedDate || now;
          const bEndDate = b.closedDate || now;
          aValue = Math.ceil((aEndDate.getTime() - a.openDate.getTime()) / (1000 * 60 * 60 * 24));
          bValue = Math.ceil((bEndDate.getTime() - b.openDate.getTime()) / (1000 * 60 * 60 * 24));
          break;
        default:
          return 0;
      }

      return compareSortValues(aValue, bValue);
    });

    return basePositions;
  }, [filteredPositions, sortColumn, sortDirection, portfolio?.portfolio_value, portfolioValue, sortQuotePriceBySymbol]);

  // Filter positions based on closed status (memoized to prevent unnecessary recalculations)
  const closedPositions = useMemo(() => positions.filter(pos => pos.closedDate), [positions]);

  const openPositionsForAllocation = useMemo(
    () => positions.filter((p) => !isPositionFullyClosed(p) && getRemainingShares(p) > 0),
    [positions],
  );

  const allocationQuoteQueries = useQueries({
    queries: openPositionsForAllocation.map((position) => quoteQueryOptions(position.symbol)),
  });

  // Apply filter to sorted positions for display
  const displayedPositions = useMemo(
    () => (showClosedPositions ? sortedPositions : sortedPositions.filter((pos) => !pos.closedDate)),
    [showClosedPositions, sortedPositions],
  );

  const tableRows = useMemo<PortfolioTableRow[]>(() => {
    if (!summarizeOpenPositions) {
      return displayedPositions.map((position) => ({ kind: 'position', position }));
    }

    const openGroups = new Map<string, StockPosition[]>();
    for (const position of displayedPositions) {
      if (isPositionFullyClosed(position)) continue;
      const list = openGroups.get(position.symbol);
      if (list) {
        list.push(position);
      } else {
        openGroups.set(position.symbol, [position]);
      }
    }

    const seenSymbols = new Set<string>();
    const rows: PortfolioTableRow[] = [];

    for (const position of displayedPositions) {
      if (isPositionFullyClosed(position)) {
        rows.push({ kind: 'position', position });
        continue;
      }

      if (seenSymbols.has(position.symbol)) {
        continue;
      }
      seenSymbols.add(position.symbol);

      const grouped = openGroups.get(position.symbol) ?? [position];
      if (grouped.length <= 1) {
        rows.push({ kind: 'position', position });
        continue;
      }

      const quantity = grouped.reduce((sum, p) => sum + p.quantity, 0);
      const remainingShares = grouped.reduce((sum, p) => sum + getRemainingShares(p), 0);
      const netCost = grouped.reduce((sum, p) => sum + p.netCost, 0);
      const weightedCost = quantity > 0 ? netCost / quantity : 0;
      const realizedGain = grouped.reduce((sum, p) => sum + calculateRealizedGainForPosition(p), 0);
      const uniqueTypes = new Set(grouped.map((p) => p.type));
      const typeLabel = uniqueTypes.size === 1 ? grouped[0].type : 'Mixed';

      rows.push({
        kind: 'summary',
        symbol: position.symbol,
        typeLabel,
        quantity,
        remainingShares,
        netCost,
        weightedCost,
        realizedGain,
        positions: grouped,
      });
    }

    return rows;
  }, [displayedPositions, summarizeOpenPositions]);

  // Calculate summary totals for displayed positions
  const summaryTotals = useMemo(() => {
    let totalQuantity = 0;
    let totalRemainingShares = 0;
    let totalNetCost = 0;
    let totalRealizedGain = 0;

    displayedPositions.forEach(position => {
      totalQuantity += position.quantity;
      totalRemainingShares += getRemainingShares(position);
      totalNetCost += position.netCost;
      totalRealizedGain += calculateRealizedGainForPosition(position);
    });

    return {
      quantity: totalQuantity,
      remainingShares: totalRemainingShares,
      netCost: totalNetCost,
      realizedGain: totalRealizedGain,
    };
  }, [displayedPositions]);

  const portfolioValueNumber = useMemo(() => {
    const parsed = parseFloat(portfolioValue);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    return portfolio?.portfolio_value ?? 0;
  }, [portfolioValue, portfolio]);

  const isUnrealizedBalanceLoading = allocationQuoteQueries.some((query) => query.isLoading);

  const unrealizedBalance = useMemo(() => {
    const totalRealizedGain = positions.reduce(
      (sum, position) => sum + calculateRealizedGainForPosition(position),
      0,
    );
    const currentBalance = portfolioValueNumber + totalRealizedGain;

    const unrealizedGain = openPositionsForAllocation.reduce((total, position, index) => {
      const currentPrice = allocationQuoteQueries[index]?.data?.price;
      if (typeof currentPrice !== 'number') {
        return total;
      }
      return total + calculateGainLoss(currentPrice, position.cost, getRemainingShares(position), position.type);
    }, 0);

    return currentBalance + unrealizedGain;
  }, [positions, portfolioValueNumber, openPositionsForAllocation, allocationQuoteQueries]);

  const totalOpenRiskDollar = useMemo(() => calculateTotalOpenRisk(positions), [positions]);
  const totalOpenRiskPercentOfPortfolio =
    portfolioValueNumber > 0 ? (totalOpenRiskDollar / portfolioValueNumber) * 100 : 0;

  // Compute trade statistics from realized exits (per-exit-row basis)
  const tradeStatistics = useMemo(() => {
    if (portfolioValueNumber <= 0) return null;

    const trades = positions.flatMap((pos) =>
      pos.exits
        .filter((exit) => exit.exitDate !== null && exit.shares > 0)
        .map((exit) => {
          const realizedGain = calculateGainLoss(exit.price, pos.cost, exit.shares, pos.type);
          const netCost = pos.cost * exit.shares;
          const percentGain = netCost !== 0 ? (realizedGain / netCost) * 100 : 0;
          const equityContribution = (realizedGain / portfolioValueNumber) * 100;
          const days = calculateDaysInTrade(pos.openDate, exit.exitDate);
          const initialRisk = calculateInitialRiskAmount(pos.cost, pos.initialStopLoss, exit.shares);
          const rMultiple = initialRisk > 0 ? realizedGain / initialRisk : 0;
          return { realizedGain, percentGain, equityContribution, days, rMultiple, netCost };
        }),
    );

    if (trades.length === 0) {
      return null;
    }

    const winners = trades.filter(t => t.realizedGain > 0);
    const losers = trades.filter(t => t.realizedGain < 0);

    const battingAverage = (winners.length / trades.length) * 100;

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const maxVal = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
    const r2 = (v: number) => Math.round(v * 100) / 100;

    const avgGainDollar = r2(avg(winners.map(t => t.realizedGain)));
    const avgGainPercent = r2(avg(winners.map(t => t.percentGain)));
    const avgGainEquity = r2(avg(winners.map(t => t.equityContribution)));

    const avgLossDollar = r2(avg(losers.map(t => Math.abs(t.realizedGain))));
    const avgLossPercent = r2(avg(losers.map(t => Math.abs(t.percentGain))));
    const avgLossEquity = r2(avg(losers.map(t => Math.abs(t.equityContribution))));

    const maxGainDollar = r2(maxVal(winners.map(t => t.realizedGain)));
    const maxGainPercent = r2(maxVal(winners.map(t => t.percentGain)));
    const maxGainEquity = r2(maxVal(winners.map(t => t.equityContribution)));

    const maxLossDollar = r2(maxVal(losers.map(t => Math.abs(t.realizedGain))));
    const maxLossPercent = r2(maxVal(losers.map(t => Math.abs(t.percentGain))));
    const maxLossEquity = r2(maxVal(losers.map(t => Math.abs(t.equityContribution))));

    const avgWinnerR = r2(avg(winners.map(t => t.rMultiple)));
    const avgLoserR = r2(avg(losers.map(t => Math.abs(t.rMultiple))));

    const avgWinnerDays = r2(avg(winners.map(t => t.days)));
    const avgLoserDays = r2(avg(losers.map(t => t.days)));
    const avgR = r2(avg(trades.map(t => t.rMultiple)));
    const avgEquityPerTrade = r2(avg(trades.map(t => t.equityContribution)));
    const avgNetCost = r2(avg(trades.map(t => t.netCost)));

    const riskRewardRatio = avgLossDollar > 0 ? r2(avgGainDollar / avgLossDollar) : 0;

    return {
      totalClosed: trades.length,
      winnerCount: winners.length,
      loserCount: losers.length,
      battingAverage: r2(battingAverage),
      avgGainDollar,
      avgGainPercent,
      avgGainEquity,
      avgLossDollar,
      avgLossPercent,
      avgLossEquity,
      maxGainDollar,
      maxGainPercent,
      maxGainEquity,
      maxLossDollar,
      maxLossPercent,
      maxLossEquity,
      avgWinnerR,
      avgLoserR,
      avgR,
      avgEquityPerTrade,
      avgNetCost,
      avgWinnerDays,
      avgLoserDays,
      riskRewardRatio,
    };
  }, [positions, portfolioValueNumber]);

  const allocationSummary = useMemo(() => {
    const equityBySymbol = new Map<string, number>();
    for (let i = 0; i < openPositionsForAllocation.length; i += 1) {
      const position = openPositionsForAllocation[i];
      const quotePrice = allocationQuoteQueries[i]?.data?.price;
      const markPrice = typeof quotePrice === 'number' ? quotePrice : position.cost;
      const equity = markPrice * getRemainingShares(position);
      if (equity <= 0) {
        continue;
      }
      const symbol = position.symbol;
      equityBySymbol.set(symbol, (equityBySymbol.get(symbol) ?? 0) + equity);
    }

    const slices = Array.from(equityBySymbol.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    const openEquity = slices.reduce((sum, item) => sum + item.value, 0);
    const cashValue = Math.max(portfolioValueNumber - openEquity, 0);

    if (cashValue > 0) {
      slices.push({
        name: 'Cash',
        value: cashValue,
      });
    }

    const total = slices.reduce((sum, item) => sum + item.value, 0);

    return {
      slices,
      openEquity,
      cashValue,
      total,
    };
  }, [openPositionsForAllocation, allocationQuoteQueries, portfolioValueNumber]);

  const hasPositions = positions.length > 0;
  const hasDisplayedPositions = tableRows.length > 0;
  const allocationSlices = allocationSummary.slices;
  const totalAllocation = allocationSummary.total;
  const openEquityValue = allocationSummary.openEquity;
  const cashAllocationValue = allocationSummary.cashValue;

  const allocationRowsWithColors = useMemo(() => {
    let equityIdx = 0;
    return allocationSlices.map((slice) => {
      const fill =
        slice.name === 'Cash'
          ? 'hsl(var(--allocation-cash))'
          : allocationColors[equityIdx++ % allocationColors.length];
      return { ...slice, fill };
    });
  }, [allocationSlices]);

  const allocationLegendRows = useMemo(
    () =>
      [...allocationRowsWithColors]
        .filter((row) => row.name !== 'Cash')
        .sort((a, b) => b.value - a.value),
    [allocationRowsWithColors],
  );

  const renderAllocationTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name?: string; value?: number } }> }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const slice = payload[0]?.payload;
    if (!slice || typeof slice.value !== 'number') {
      return null;
    }

    const percentage = totalAllocation > 0 ? (slice.value / totalAllocation) * 100 : 0;

    return (
      <div className="rounded-md border border-border bg-background/95 px-3 py-2 shadow-lg">
        <p className="text-sm font-semibold">{slice.name ?? 'Allocation'}</p>
        <p className="text-xs text-muted-foreground">
          {formatCurrency(slice.value)} · {percentage.toFixed(1)}%
        </p>
      </div>
    );
  };

  // Show loading state while auth resolves
  if (isAuthLoading) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg text-muted-foreground mb-4">Please log in to view your portfolio</p>
            <Link href="/login">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (portfolioError) {
    return (
      <div className="w-full p-4 sm:p-6">       
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg text-red-600 mb-4">Error loading portfolio: {portfolioError}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  const handlePortfolioSelection = (value: string) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    setShowEditPortfolioDialog(false);
    setEditingPosition(null);
    setPositionToDelete(null);
    setShowDeleteDialog(false);
    void selectPortfolio(parsed);
  };

  const handleTabChange = (value: string) => {
    if (isPortfolioTab(value)) {
      setActiveTab(value);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-background via-background to-muted/20">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="space-y-2">
          <PortfolioToolbar
            portfolios={portfolios}
            selectedPortfolioKey={selectedPortfolioKey}
            handlePortfolioSelection={handlePortfolioSelection}
            isPortfolioLoading={isPortfolioLoading}
            defaultPortfolioKey={defaultPortfolioKey}
            setPortfolioAsDefault={setPortfolioAsDefault}
            handleOpenCreatePortfolio={handleOpenCreatePortfolio}
            handleEditPortfolio={handleEditPortfolio}
            isPortfolioRetired={isPortfolioRetired}
            onRetireClick={handleRetireClick}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
          />

          <TabsContent value="positions" className="px-3 sm:px-4">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Positions Table Card */}
          <div>
            <div className="mb-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Input
                    value={symbolFilterInput}
                    onChange={(e) => setSymbolFilterInput(e.target.value.toUpperCase())}
                    placeholder="Filter Symbol Prefix"
                    aria-label="Filter positions by symbol"
                    className="h-8 w-full text-xs bg-background/50 sm:w-[220px]"
                  />
                  <Button
                    size="sm"
                    variant={showClosedPositions ? "secondary" : "outline"}
                    onClick={() => setShowClosedPositions(!showClosedPositions)}
                    disabled={closedPositions.length === 0}
                    className="h-8 text-xs"
                  >
                    {showClosedPositions ? "Hide" : "Show"} Closed ({closedPositions.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={summarizeOpenPositions ? "secondary" : "outline"}
                    onClick={() => setSummarizeOpenPositions(!summarizeOpenPositions)}
                    disabled={!canSummarizeOpenPositions}
                    className="h-8 text-xs"
                  >
                    {summarizeOpenPositions ? "Show Individual" : "Summarize Symbols"}
                  </Button>
                </div>
                <div className="flex shrink-0 items-center gap-2 max-sm:ml-auto">
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    Total Open Risk
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums whitespace-nowrap">
                    {`-${formatCurrencyTwoDecimals(totalOpenRiskDollar)} / -${totalOpenRiskPercentOfPortfolio.toFixed(2)}%`}
                  </span>
                </div>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(100vh-180px)] border-y border-l border-border [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
              {isPortfolioLoading ? (
                <div className="flex flex-col gap-2 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading positions...</span>
                  </div>
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : hasPositions && hasDisplayedPositions ? (
                <Table>
                  <TableHeader className="!border-b-0 sticky top-0 z-30 bg-background [&_th]:bg-background [&_th]:border-b [&_th]:border-border">
                    <TableRow>
                      {visibleColumns.map((col) =>
                        renderPortfolioColumnHeader(
                          col,
                          sortColumn,
                          sortDirection,
                          handleSort,
                          col.isAnchor ? (
                            <ColumnSettingsPopover
                              columns={orderedColumns}
                              hiddenColumns={hiddenColumns}
                              onToggleColumn={toggleColumn}
                              onReorderColumns={reorderColumns}
                              onReset={resetColumnsToDefaults}
                            />
                          ) : undefined
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row) => {
                      const isSummaryRow = row.kind === 'summary';
                      const position = row.kind === 'position' ? row.position : row.positions[0];
                      const isFullyClosed = isPositionFullyClosed(position);
                      const realizedGain = row.kind === 'summary' ? row.realizedGain : calculateRealizedGainForPosition(position);
                      const openRiskDisplay = getOpenRiskDisplay(position);
                      const openHeatPercent = getOpenHeatPercent(position, portfolioValueNumber);

                      return (
                      <TableRow key={row.kind === 'summary' ? `summary-${row.symbol}` : position.id} className={cn(
                        "border-b even:bg-muted/20 hover:bg-muted/40 transition-colors"
                      )}>
                        {visibleColumns.map((col) => {
                          const baseCellClass = col.isAnchor
                            ? "font-medium border-r font-mono sticky left-0 z-20 !bg-background"
                            : col.id === 'actions'
                              ? ""
                              : "border-r font-mono";

                          switch (col.id) {
                            case 'symbol': {
                              const isOption = position.symbol.includes(' ');
                              const symbolNode = isOption ? (
                                <span>{position.symbol}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setChartPosition(position);
                                    setShowChartModal(true);
                                  }}
                                  className="text-left hover:underline focus:outline-none focus:underline cursor-pointer"
                                >
                                  {position.symbol}
                                </button>
                              );

                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? (
                                    <span className="inline-flex items-center gap-2">
                                      <span>{row.symbol}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Summary</span>
                                    </span>
                                  ) : (
                                    symbolNode
                                  )}
                                </TableCell>
                              );
                            }
                            case 'price':
                              return <TableCell key={col.id} className={baseCellClass}><PriceCell symbol={position.symbol} /></TableCell>;
                            case 'type':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-xs font-medium",
                                    (isSummaryRow ? row.typeLabel : position.type) === 'Long'
                                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                      : (isSummaryRow ? row.typeLabel : position.type) === 'Short'
                                        ? "bg-red-500/20 text-red-400"
                                        : "bg-muted text-muted-foreground"
                                  )}>
                                    {isSummaryRow ? row.typeLabel : position.type}
                                  </span>
                                </TableCell>
                              );
                            case 'cost':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? formatCurrencyTwoDecimals(row.weightedCost) : formatCurrency(position.cost)}
                                </TableCell>
                              );
                            case 'quantity':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? row.quantity : position.quantity}</TableCell>;
                            case 'remainingShares':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <div className="text-center font-medium font-mono">
                                    {isSummaryRow
                                      ? row.remainingShares
                                      : getRemainingShares(position)}
                                  </div>
                                </TableCell>
                              );
                            case 'netCost':
                              return <TableCell key={col.id} className={cn(baseCellClass, "font-medium")}>{formatCurrency(isSummaryRow ? row.netCost : position.netCost)}</TableCell>;
                            case 'equity':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <EquityCell
                                    symbol={position.symbol}
                                    quantity={isSummaryRow ? row.remainingShares : getRemainingShares(position)}
                                  />
                                </TableCell>
                              );
                            case 'gainLoss':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? (
                                    <SummaryGainLossCell symbol={row.symbol} positions={row.positions} />
                                  ) : isFullyClosed ? (
                                    <span className={cn("font-medium", realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-400")}>
                                      {formatCurrency(realizedGain)}
                                    </span>
                                  ) : (
                                    <GainLossCell
                                      symbol={position.symbol}
                                      cost={position.cost}
                                      quantity={getRemainingShares(position)}
                                      type={position.type}
                                    />
                                  )}
                                </TableCell>
                              );
                            case 'portfolioGain':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <PortfolioGainCell
                                    symbol={position.symbol}
                                    positions={row.kind === 'summary' ? row.positions : [position]}
                                    portfolioValue={portfolioValueNumber}
                                  />
                                </TableCell>
                              );
                            case 'realizedGain':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <span className={cn("font-medium", realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-400")}>
                                    {formatCurrency(realizedGain)}
                                  </span>
                                </TableCell>
                              );
                            case 'rMultiple':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <RMultipleCell
                                    symbol={position.symbol}
                                    positions={row.kind === 'summary' ? row.positions : [position]}
                                  />
                                </TableCell>
                              );
                            case 'portfolioPercent':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <PortfolioPercentCell
                                    symbol={position.symbol}
                                    quantity={isSummaryRow ? row.remainingShares : getRemainingShares(position)}
                                    portfolioValue={portfolioValueNumber}
                                  />
                                </TableCell>
                              );
                            case 'initialStopLoss':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? '-' : <span>{formatCurrency(position.initialStopLoss)}</span>}</TableCell>;
                            case 'stopLoss':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? '-' : <span className="font-medium">{formatCurrency(position.stopLoss)}</span>}</TableCell>;
                            case 'openRisk':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : <span className={cn("font-medium", openRiskDisplay.colorClass)}>{openRiskDisplay.text}</span>}
                                </TableCell>
                              );
                            case 'openHeat':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : (
                                    <span className={cn("font-medium", getOpenHeatColorClass(openHeatPercent))}>
                                      {openHeatPercent === null ? "N/A" : `${openHeatPercent.toFixed(2)}%`}
                                    </span>
                                  )}
                                </TableCell>
                              );
                            case 'exits':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : <ExitsCell position={position} />}
                                </TableCell>
                              );
                            case 'openDate':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? '-' : format(position.openDate, "MM/dd/yy")}</TableCell>;
                            case 'closedDate':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : (position.closedDate ? format(position.closedDate, "MM/dd/yy") : <span className="text-muted-foreground">-</span>)}
                                </TableCell>
                              );
                            case 'daysInTrade':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : <span className="font-medium">{`${calculateDaysInTrade(position.openDate, position.closedDate)}d`}</span>}
                                </TableCell>
                              );
                            case 'actions':
                              return (
                                <TableCell key={col.id}>
                                  {isSummaryRow ? (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  ) : !isPortfolioRetired ? (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" onClick={() => handleEditPosition(position)} className="h-7 w-7 p-0">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeletePosition(position)}
                                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  )}
                                </TableCell>
                              );
                            default:
                              return null;
                          }
                        })}
                      </TableRow>
                    )})}
                    {hasDisplayedPositions && (
                      <SummaryTotalsRow 
                        positions={displayedPositions}
                        portfolioValue={portfolioValueNumber}
                        summaryTotals={summaryTotals}
                        visibleColumns={visibleColumns}
                      />
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  {hasPositions ? "No positions match the current filter." : "No positions yet. Add a stock or option position to get started."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className={cn("w-full shrink-0", isPositionsSidebarCollapsed ? "xl:w-auto" : "xl:w-80")}>
          <div className="rounded-xl border border-border/40 bg-card/60 p-2">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPositionsSidebarCollapsed((prev) => !prev)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                aria-label={isPositionsSidebarCollapsed ? 'Expand positions sidebar cards' : 'Collapse positions sidebar cards'}
              >
                {isPositionsSidebarCollapsed ? (
                  <ChevronsLeft className="h-4 w-4" />
                ) : (
                  <ChevronsRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {!isPositionsSidebarCollapsed && (
              <div className="space-y-3 pt-1">
                <PositionSizingCalculator
                  portfolioBalance={unrealizedBalance}
                  isBalanceLoading={isUnrealizedBalanceLoading}
                />

                {/* Add Position Panel */}
                <section className="rounded-lg border border-border/35 bg-background/70 p-3">
                  <div className="text-sm font-semibold">
                    + Add Position
                  </div>
                  {isPortfolioRetired && (
                    <p className="pt-1 text-xs text-muted-foreground">This portfolio is retired.</p>
                  )}
                  <div className="space-y-2.5 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                        <Input
                          type="text"
                          placeholder={positionInstrument === 'option' ? 'AAPL240621C00180000' : 'AAPL'}
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          disabled={isPortfolioRetired}
                          className="h-8 text-sm font-mono bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Type</label>
                        <Select value={type} onValueChange={(value: 'Long' | 'Short') => setType(value)} disabled={isPortfolioRetired}>
                          <SelectTrigger className="h-8 text-sm bg-background/50" disabled={isPortfolioRetired}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Long">Long</SelectItem>
                            <SelectItem value="Short">Short</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Instrument</label>
                      <Select value={positionInstrument} onValueChange={(value: 'stock' | 'option') => setPositionInstrument(value)} disabled={isPortfolioRetired}>
                        <SelectTrigger className="h-8 text-sm bg-background/50" disabled={isPortfolioRetired}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stock">Stock</SelectItem>
                          <SelectItem value="option">Option</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Cost</label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={cost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = value.split('.');
                            const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
                            setCost(formattedValue);
                          }}
                          disabled={isPortfolioRetired}
                          className="h-8 text-sm font-mono bg-background/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          {positionInstrument === 'option' ? 'Contracts' : 'Quantity'}
                        </label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder={positionInstrument === 'option' ? '1' : '0'}
                          value={quantity}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            const parts = value.split('.');
                            const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
                            setQuantity(formattedValue);
                          }}
                          disabled={isPortfolioRetired}
                          className="h-8 text-sm font-mono bg-background/50"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Initial Stop Loss {positionInstrument === 'option' ? '(Optional)' : ''}
                      </label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={positionInstrument === 'option' ? '0.00 (defaults to 0)' : '0.00'}
                        value={initialStopLoss}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          const parts = value.split('.');
                          const formattedValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
                          setInitialStopLoss(formattedValue);
                        }}
                        disabled={isPortfolioRetired}
                        className="h-8 text-sm font-mono bg-background/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Open Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isPortfolioRetired}
                            className={cn(
                              "w-full h-8 justify-start text-left text-sm font-normal bg-background/50",
                              !openDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                            {openDate ? format(openDate, "MM/dd/yyyy") : "Select"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={openDate}
                            onSelect={(date) => date && setOpenDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <Button
                      onClick={handleAddStock}
                      disabled={isAddButtonDisabled}
                      className="w-full h-8 text-sm"
                    >
                      Add Position
                    </Button>
                  </div>
                </section>

                {/* Allocation Panel */}
                <section className="rounded-lg border border-border/35 bg-background/70 p-3">
                  <div className="text-sm font-semibold">
                    Allocation
                  </div>
                  <div className="pt-3">
                    {isPortfolioLoading ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-14 rounded-lg" />
                          <Skeleton className="h-14 rounded-lg" />
                        </div>
                        <Skeleton className="mx-auto h-40 max-w-[220px] rounded-lg" />
                        <Skeleton className="h-28 w-full rounded-lg" />
                      </div>
                    ) : allocationSummary.total === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No allocation data</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-border/50 bg-background/50 p-2.5">
                            <p className="text-xs font-medium text-muted-foreground">Open equity</p>
                            <p className="text-sm font-bold font-mono tabular-nums text-foreground">
                              {formatCurrency(openEquityValue)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/45 p-2.5 dark:bg-muted/35">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-sm ring-1 ring-border/50"
                                style={{ backgroundColor: 'hsl(var(--allocation-cash))' }}
                                aria-hidden
                              />
                              <p className="text-xs font-medium text-muted-foreground">Cash</p>
                            </div>
                            <p className="mt-0.5 text-sm font-bold font-mono tabular-nums text-foreground">
                              {formatCurrency(cashAllocationValue)}
                            </p>
                          </div>
                        </div>

                        <div className="mx-auto h-[168px] w-full max-w-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={allocationRowsWithColors}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={34}
                                outerRadius={62}
                                paddingAngle={3}
                                stroke="hsl(var(--card))"
                                strokeWidth={2}
                              >
                                {allocationRowsWithColors.map((row) => (
                                  <Cell key={row.name} fill={row.fill} />
                                ))}
                              </Pie>
                              <RechartsTooltip content={renderAllocationTooltip} />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        </div>

                        <ul
                          className="grid grid-cols-2 gap-x-2 gap-y-1.5 overflow-y-auto rounded-lg border border-border/40 bg-muted/15 px-2 py-2 text-xs dark:bg-muted/10 sm:text-sm max-h-40"
                          aria-label="Allocation by position"
                        >
                          {allocationLegendRows.map((row) => (
                            <li
                              key={row.name}
                              className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40"
                            >
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-border/60"
                                style={{ backgroundColor: row.fill }}
                                aria-hidden
                              />
                              <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </aside>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="px-3 sm:px-4">
            <PortfolioCalendarTab
              positions={positions}
              portfolioValue={portfolio?.portfolio_value ?? (portfolioValue ? parseFloat(portfolioValue) : 0)}
              isLoading={isPortfolioLoading}
            />
          </TabsContent>

          <TabsContent value="backtest" className="px-3 sm:px-4">
            <BacktestTab closedPositions={positions.filter(isPositionFullyClosed)} />
          </TabsContent>

          <TabsContent value="stats" className="px-3 sm:px-4">
            <PortfolioHero
              portfolioName={portfolioName}
              portfolioValue={portfolio?.portfolio_value ?? (portfolioValue ? parseFloat(portfolioValue) : 0)}
              positions={positions}
              isLoading={isPortfolioLoading}
              tradeStatistics={tradeStatistics}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Position Modal */}
      <EditPositionModal
        position={editingPosition}
        isOpen={showEditModal}
        onClose={handleCancelEdit}
        onSavePosition={updatePosition}
        onAddExit={addExit}
        onUpdateExit={updateExit}
        onDeleteExit={deleteExit}
      />

      <PositionChartModal
        key={chartPosition?.id ?? 'none'}
        position={chartPosition}
        isOpen={showChartModal}
        portfolioValue={portfolioValueNumber}
        onClose={() => {
          setShowChartModal(false);
          setChartPosition(null);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Position</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this position for {positionToDelete?.symbol}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeletePosition}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeletePosition}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Dialog */}
      <Dialog
        open={showEditPortfolioDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelPortfolioEdit();
            return;
          }
          setShowEditPortfolioDialog(true);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Portfolio</DialogTitle>
            <DialogDescription>
              Update the portfolio name and starting balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-portfolio-name" className="block text-sm font-medium text-foreground">
                Portfolio Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="edit-portfolio-name"
                type="text"
                placeholder="My Portfolio"
                value={tempPortfolioName}
                onChange={(e) => setTempPortfolioName(e.target.value)}
                disabled={isSavingPortfolio}
                className="text-base"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-portfolio-value" className="block text-sm font-medium text-foreground">
                Starting Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none">
                  $
                </span>
                <Input
                  id="edit-portfolio-value"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tempPortfolioValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    const formattedValue = parts.length > 2
                      ? parts[0] + '.' + parts.slice(1).join('')
                      : value;
                    setTempPortfolioValue(formattedValue);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setTempPortfolioValue(numValue.toFixed(2));
                    } else if (value === '') {
                      setTempPortfolioValue('');
                    }
                  }}
                  disabled={isSavingPortfolio}
                  className="pl-7 text-base"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelPortfolioEdit}
              disabled={isSavingPortfolio}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePortfolio}
              disabled={isSavingPortfolio || !tempPortfolioName.trim()}
            >
              {isSavingPortfolio ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Portfolio Dialog */}
      <Dialog open={showCreatePortfolioDialog} onOpenChange={setShowCreatePortfolioDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Portfolio</DialogTitle>
            <DialogDescription>
              Create a new portfolio to track your investments separately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-portfolio-name" className="block text-sm font-medium text-foreground">
                Portfolio Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="new-portfolio-name"
                type="text"
                placeholder="e.g., Retirement Portfolio, Tech Stocks"
                value={newPortfolioName}
                onChange={(e) => setNewPortfolioName(e.target.value)}
                disabled={isCreatingPortfolio}
                className="text-base"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="new-portfolio-value" className="block text-sm font-medium text-foreground">
                Initial Portfolio Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground pointer-events-none">
                  $
                </span>
                <Input
                  id="new-portfolio-value"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={newPortfolioValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    const formattedValue = parts.length > 2 
                      ? parts[0] + '.' + parts.slice(1).join('')
                      : value;
                    setNewPortfolioValue(formattedValue);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setNewPortfolioValue(numValue.toFixed(2));
                    } else if (value === '') {
                      setNewPortfolioValue('');
                    }
                  }}
                  disabled={isCreatingPortfolio}
                  className="pl-7 text-base"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can leave this as 0 and update it later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelCreatePortfolio}
              disabled={isCreatingPortfolio}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePortfolio}
              disabled={isCreatingPortfolio || !newPortfolioName.trim()}
            >
              {isCreatingPortfolio ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Portfolio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retire / Un-retire Portfolio Dialog */}
      <Dialog open={showRetireDialog} onOpenChange={setShowRetireDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPortfolioRetired ? 'Un-retire Portfolio' : 'Retire Portfolio'}</DialogTitle>
            <DialogDescription>
              {isPortfolioRetired
                ? 'Un-retire this portfolio and allow adding and editing positions again?'
                : 'Retire this portfolio? You won’t be able to add, edit, or delete positions until you un-retire it. Stats and history remain available.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRetireDialog(false)}
              disabled={isTogglingRetired}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmRetireToggle} disabled={isTogglingRetired}>
              {isTogglingRetired ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPortfolioRetired ? 'Un-retiring...' : 'Retiring...'}
                </>
              ) : (
                isPortfolioRetired ? 'Un-retire Portfolio' : 'Retire Portfolio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
