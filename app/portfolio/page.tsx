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
import { CalendarIcon, InfoIcon, X, Loader2, Pencil, PlusCircle, Star } from 'lucide-react';
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
import { PercentageChange } from '@/components/ui/PriceIndicator';
import { quoteQueryOptions, useQuote } from '@/hooks/FMP/useQuote';
import { usePortfolio, type StockPosition } from '@/hooks/usePortfolio';
import { useAuth } from '@/lib/context/auth-context';
import { calculateRPriceTargets } from '@/utils/portfolioCalculations';
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
  { id: 'priceTarget2R', label: 'PT 1', tooltip: '2R Price Target' },
  { id: 'priceTarget2RShares', label: 'PT 1 #', tooltip: 'Shares sold at PT 1' },
  { id: 'priceTarget5R', label: 'PT 2', tooltip: '5R Price Target' },
  { id: 'priceTarget5RShares', label: 'PT 2 #', tooltip: 'Shares sold at PT 2' },
  { id: 'priceTarget21Day', label: '21 Day Trail' },
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

type HistogramDistributionEntry = {
  binKey: HistogramBucketKey;
  rangeLabel: string;
  trades: number;
  bucketType: HistogramBucketType;
};

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
      binKey: HistogramBucketKey;
      rangeLabel: string;
    }
  | {
      kind: 'holdingPeriod';
      positionId: string;
      positionLabel: string;
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
  { id: 'rMultiple', label: 'R' },
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
        className="sticky left-0 z-20 !bg-background border-r border-border"
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
  let positionGain = 0;

  // PT1 trim gain
  if (position.priceTarget2RShares > 0 && position.priceTarget2R > 0) {
    // For short positions: gain = (entry - exit) * shares (positive when exit < entry)
    // For long positions: gain = (exit - entry) * shares (positive when exit > entry)
    const pt1Gain = position.type === 'Long'
      ? (position.priceTarget2R - position.cost) * position.priceTarget2RShares
      : (position.cost - position.priceTarget2R) * position.priceTarget2RShares;
    positionGain += pt1Gain;
  }

  // PT2 trim gain
  if (position.priceTarget5RShares > 0 && position.priceTarget5R > 0) {
    const pt2Gain = position.type === 'Long'
      ? (position.priceTarget5R - position.cost) * position.priceTarget5RShares
      : (position.cost - position.priceTarget5R) * position.priceTarget5RShares;
    positionGain += pt2Gain;
  }

  // Final exit gain (21 Day Trail or remaining shares)
  if (position.priceTarget21Day > 0) {
    const remainingShares = position.quantity - position.priceTarget2RShares - position.priceTarget5RShares;
    const finalGain = position.type === 'Long'
      ? (position.priceTarget21Day - position.cost) * remainingShares
      : (position.cost - position.priceTarget21Day) * remainingShares;
    positionGain += finalGain;
  }

  return positionGain;
};

const calculateInitialRiskForPosition = (position: StockPosition): number => {
  if (!hasConfiguredStopLoss(position.cost, position.initialStopLoss)) {
    return 0;
  }
  return Math.abs(position.cost - position.initialStopLoss) * position.quantity;
};

const calculateProjectedGainForPosition = (position: StockPosition, currentPrice?: number): number => {
  const realizedGain = calculateRealizedGainForPosition(position);
  if (isPositionFullyClosed(position) || position.remainingShares <= 0) {
    return realizedGain;
  }

  const markPrice = typeof currentPrice === 'number' ? currentPrice : position.cost;
  const unrealizedGain = calculateGainLoss(markPrice, position.cost, position.remainingShares, position.type);
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
  return (
    position.priceTarget21Day > 0 ||
    position.remainingShares <= 0 ||
    Boolean(position.closedDate && (position.priceTarget2RShares > 0 || position.priceTarget5RShares > 0))
  );
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
    (sum, position) => sum + calculateGainLoss(quote.price, position.cost, position.remainingShares, position.type),
    0,
  );
  const totalCostBasis = positions.reduce((sum, position) => sum + (position.cost * position.remainingShares), 0);
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
    .filter((pos) => !pos.closedDate && pos.remainingShares > 0)
    .reduce((total, pos) => {
      if (!hasConfiguredStopLoss(pos.cost, pos.stopLoss)) {
        return total;
      }
      const perShare =
        pos.type === 'Short' ? pos.stopLoss - pos.cost : pos.cost - pos.stopLoss;
      return total + perShare * pos.remainingShares;
    }, 0);
  return Math.max(0, raw);
}

type PortfolioTab = 'positions' | 'stats';
const SELECTED_PORTFOLIO_TAB_STORAGE_KEY = 'financeguy-selected-portfolio-tab';

const isPortfolioTab = (value: string): value is PortfolioTab => value === 'positions' || value === 'stats';

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
  portfolios: Array<{ portfolio_key: number | string; portfolio_name: string }>;
  selectedPortfolioKey: number | null;
  handlePortfolioSelection: (value: string) => void;
  isPortfolioLoading: boolean;
  defaultPortfolioKey: number | null;
  setPortfolioAsDefault: (key: number | null) => void;
  handleOpenCreatePortfolio: () => void;
  handleEditPortfolio: () => void;
  isEditingPortfolio: boolean;
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
  isEditingPortfolio,
  activeTab,
  handleTabChange,
}: PortfolioToolbarProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="flex flex-col gap-2 px-3 py-2.5 border-b border-border/50 bg-muted/30 lg:flex-row lg:items-center lg:justify-between">
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
                <SelectItem key={record.portfolio_key} value={String(record.portfolio_key)}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">
                      {record.portfolio_name || `Portfolio ${record.portfolio_key}`}
                    </span>
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
          {!isEditingPortfolio && (
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
              variant={activeTab === 'stats' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5 !text-sm font-medium"
              onClick={() => handleTabChange('stats')}
            >
              Stats
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
  isEditingPortfolio: boolean;
  tempPortfolioName: string;
  tempPortfolioValue: string;
  setTempPortfolioName: (value: string) => void;
  setTempPortfolioValue: (value: string) => void;
  handleSavePortfolio: () => void;
  handleCancelPortfolioEdit: () => void;
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
    totalR: number;
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
  isEditingPortfolio,
  tempPortfolioName,
  tempPortfolioValue,
  setTempPortfolioName,
  setTempPortfolioValue,
  handleSavePortfolio,
  handleCancelPortfolioEdit,
  tradeStatistics,
}: PortfolioHeroProps) {
  const [selectedDrilldown, setSelectedDrilldown] = useState<PortfolioHeroDrilldownSelection | null>(null);

  // Calculate metrics
  const totalOpenRisk = useMemo(() => calculateTotalOpenRisk(positions), [positions]);
  const riskPercent = portfolioValue > 0 ? (totalOpenRisk / portfolioValue) * 100 : 0;
  const openPositionsForPnl = useMemo(
    () => positions.filter((position) => !isPositionFullyClosed(position) && position.remainingShares > 0),
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
      return total + calculateGainLoss(currentPrice, position.cost, position.remainingShares, position.type);
    }, 0);
  }, [openPositionsForPnl, pnlQuoteQueries]);

  const openEquity = useMemo(() => {
    return openPositionsForPnl.reduce((total, position, index) => {
      const currentPrice = pnlQuoteQueries[index]?.data?.price;
      if (typeof currentPrice !== 'number') {
        return total;
      }
      return total + (currentPrice * position.remainingShares);
    }, 0);
  }, [openPositionsForPnl, pnlQuoteQueries]);

  const realizedGain = useMemo(() => {
    const total = positions.reduce((sum, position) => {
      const hasRealizedShares =
        (position.priceTarget2RShares > 0 && position.priceTarget2R > 0) ||
        (position.priceTarget5RShares > 0 && position.priceTarget5R > 0) ||
        position.priceTarget21Day > 0;

      if (!hasRealizedShares) {
        return sum;
      }

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

  const balanceOverTimeData = useMemo(() => {
    const eventsByDate = new Map<number, number>();

    positions.forEach((position) => {
      if (!position.closedDate) {
        return;
      }
      const dayTimestamp = new Date(
        position.closedDate.getFullYear(),
        position.closedDate.getMonth(),
        position.closedDate.getDate(),
      ).getTime();
      const realizedGain = calculateRealizedGainForPosition(position);
      eventsByDate.set(dayTimestamp, (eventsByDate.get(dayTimestamp) ?? 0) + realizedGain);
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
  }, [positions, portfolioValue]);

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

  const holdingPeriodByPositionData = useMemo(() => {
    const openPriceBySymbol = new Map<string, number>();
    openPositionsForPnl.forEach((position, index) => {
      const price = pnlQuoteQueries[index]?.data?.price;
      if (typeof price === 'number') {
        openPriceBySymbol.set(position.symbol, price);
      }
    });

    return positions
      .map((position, index) => {
        const totalGainLoss = calculateProjectedGainForPosition(position, openPriceBySymbol.get(position.symbol));
        const portfolioGainPercent = portfolioValue > 0 ? (totalGainLoss / portfolioValue) * 100 : 0;
        return {
          positionId: position.id,
          positionLabel: `${position.symbol}-${index + 1}`,
          status: isPositionFullyClosed(position) ? 'Closed' : 'Open',
          totalGainLoss,
          portfolioGainPercent,
          closedAt: position.closedDate ? position.closedDate.getTime() : null,
          openedAt: position.openDate.getTime(),
        };
      })
      .sort((a, b) => {
        if (a.closedAt !== null && b.closedAt !== null) {
          return a.closedAt - b.closedAt;
        }
        if (a.closedAt !== null && b.closedAt === null) {
          return -1;
        }
        if (a.closedAt === null && b.closedAt !== null) {
          return 1;
        }
        return a.openedAt - b.openedAt;
      });
  }, [positions, openPositionsForPnl, pnlQuoteQueries, portfolioValue]);

  const histogramAxisDomain = useMemo(() => {
    if (holdingPeriodByPositionData.length === 0) {
      return {
        minDollar: -1,
        maxDollar: 1,
        minPercent: -1,
        maxPercent: 1,
      };
    }

    const values = holdingPeriodByPositionData.map((entry) => entry.totalGainLoss);
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
  }, [holdingPeriodByPositionData, portfolioValue]);

  const gainLossDistributionData = useMemo<HistogramDistributionEntry[]>(() => {
    const counts = HISTOGRAM_BUCKETS.reduce((acc, bin) => {
      acc[bin.key] = 0;
      return acc;
    }, {} as Record<HistogramBucketKey, number>);

    positions.forEach((position) => {
      if (!position.closedDate || position.netCost === 0) {
        return;
      }

      const realizedGain = calculateRealizedGainForPosition(position);
      const percentGain = (realizedGain / position.netCost) * 100;
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
  }, [positions]);

  const realizedEquityDistributionData = useMemo<HistogramDistributionEntry[]>(() => {
    const counts = HISTOGRAM_BUCKETS.reduce((acc, bin) => {
      acc[bin.key] = 0;
      return acc;
    }, {} as Record<HistogramBucketKey, number>);
    const equityBase = currentBalance > 0 ? currentBalance : portfolioValue;

    positions.forEach((position) => {
      if (equityBase <= 0) {
        return;
      }
      const realizedGain = calculateRealizedGainForPosition(position);
      if (realizedGain === 0) {
        return;
      }

      const realizedEquityPct = (realizedGain / equityBase) * 100;
      if (!Number.isFinite(realizedEquityPct)) {
        return;
      }

      const binKey = getBinKeyForPercent(realizedEquityPct);
      counts[binKey] += 1;
    });

    return HISTOGRAM_BUCKETS.map((bin) => ({
      binKey: bin.key,
      rangeLabel: bin.label,
      trades: counts[bin.key] ?? 0,
      bucketType: bin.bucketType,
    }));
  }, [positions, currentBalance, portfolioValue]);

  const openHistogramDrilldown = (histogramType: HistogramDrilldownType, entry: HistogramDistributionEntry) => {
    setSelectedDrilldown({
      kind: 'distribution',
      histogramType,
      binKey: entry.binKey,
      rangeLabel: entry.rangeLabel,
    });
  };

  const openHoldingPeriodDrilldown = (entry: { positionId: string; positionLabel: string }) => {
    setSelectedDrilldown({
      kind: 'holdingPeriod',
      positionId: entry.positionId,
      positionLabel: entry.positionLabel,
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

  const selectedHistogramPositions = useMemo(() => {
    if (!selectedDrilldown) {
      return [];
    }

    const equityBase = currentBalance > 0 ? currentBalance : portfolioValue;

    if (selectedDrilldown.kind === 'holdingPeriod') {
      const match = positions.find((position) => position.id === selectedDrilldown.positionId);
      return match ? [match] : [];
    }

    if (selectedDrilldown.kind === 'realizedSymbol') {
      return positions.filter((position) =>
        position.symbol === selectedDrilldown.symbol && calculateRealizedGainForPosition(position) !== 0,
      );
    }

    if (selectedDrilldown.kind === 'realizedHoldingPeriod') {
      return positions.filter((position) => {
        const realizedGainValue = calculateRealizedGainForPosition(position);
        if (realizedGainValue === 0) {
          return false;
        }

        const holdingDays = calculateDaysInTrade(position.openDate, position.closedDate);
        return getHoldingPeriodBucketKey(holdingDays) === selectedDrilldown.bucketKey;
      });
    }

    return positions.filter((position) => {
      if (selectedDrilldown.histogramType === 'realizedGain') {
        if (!position.closedDate || position.netCost === 0) {
          return false;
        }
        const realizedGainValue = calculateRealizedGainForPosition(position);
        const percentGain = (realizedGainValue / position.netCost) * 100;
        if (!Number.isFinite(percentGain)) {
          return false;
        }
        return getBinKeyForPercent(percentGain) === selectedDrilldown.binKey;
      }

      if (equityBase <= 0) {
        return false;
      }

      const realizedGainValue = calculateRealizedGainForPosition(position);
      if (realizedGainValue === 0) {
        return false;
      }
      const realizedEquityPct = (realizedGainValue / equityBase) * 100;
      if (!Number.isFinite(realizedEquityPct)) {
        return false;
      }
      return getBinKeyForPercent(realizedEquityPct) === selectedDrilldown.binKey;
    });
  }, [selectedDrilldown, positions, currentBalance, portfolioValue]);

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
      return `Holding Period by Position - ${selectedDrilldown.positionLabel}`;
    }

    if (selectedDrilldown.kind === 'realizedHoldingPeriod') {
      return `Realized Gain/Loss by Avg Holding Period - ${selectedDrilldown.rangeLabel}`;
    }

    return `Realized Gain/Loss by Symbol - ${selectedDrilldown.symbol}`;
  }, [selectedDrilldown]);

  const realizedGainsBySymbolData = useMemo(() => {
    const gainBySymbol = new Map<string, number>();

    positions.forEach((position) => {
      const realizedGain = calculateRealizedGainForPosition(position);
      if (realizedGain === 0) {
        return;
      }
      gainBySymbol.set(position.symbol, (gainBySymbol.get(position.symbol) ?? 0) + realizedGain);
    });

    return Array.from(gainBySymbol.entries())
      .map(([symbol, realizedGain]) => ({ symbol, realizedGain }))
      .sort((a, b) => b.realizedGain - a.realizedGain);
  }, [positions]);

  const realizedGainByAvgHoldingPeriodData = useMemo(() => {
    const totals = HOLDING_PERIOD_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.key] = 0;
      return acc;
    }, {} as Record<HoldingPeriodBucketKey, number>);

    const counts = HOLDING_PERIOD_BUCKETS.reduce((acc, bucket) => {
      acc[bucket.key] = 0;
      return acc;
    }, {} as Record<HoldingPeriodBucketKey, number>);

    positions.forEach((position) => {
      const realizedGainValue = calculateRealizedGainForPosition(position);
      if (realizedGainValue === 0) {
        return;
      }

      const holdingDays = calculateDaysInTrade(position.openDate, position.closedDate);
      const bucketKey = getHoldingPeriodBucketKey(holdingDays);
      totals[bucketKey] += realizedGainValue;
      counts[bucketKey] += 1;
    });

    return HOLDING_PERIOD_BUCKETS.map((bucket) => ({
      bucketKey: bucket.key,
      rangeLabel: bucket.label,
      realizedGain: roundToTwoDecimals(totals[bucket.key] ?? 0),
      trades: counts[bucket.key] ?? 0,
    }));
  }, [positions]);

  if (isLoading) {
    return <PortfolioHeroSkeleton />;
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Main Hero Content */}
      {isEditingPortfolio ? (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Portfolio Name
              </label>
              <Input
                type="text"
                placeholder="My Portfolio"
                value={tempPortfolioName}
                onChange={(e) => setTempPortfolioName(e.target.value)}
                className="text-lg font-semibold bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Portfolio Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none font-mono">
                  $
                </span>
                <Input
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
                  className="text-lg font-semibold pl-7 font-mono bg-background/50"
                />
              </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSavePortfolio} size="sm">Save</Button>
              <Button variant="outline" onClick={handleCancelPortfolioEdit} size="sm">Cancel</Button>
            </div>
          </div>
        </div>
      ) : (
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
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total R</p>
                  <p className="text-lg font-bold font-mono">{tradeStatistics.totalR.toFixed(2)}R</p>
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
                  <XAxis dataKey="pointLabel" tick={{ fontSize: 10 }} />
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
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Holding Period by Position</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={holdingPeriodByPositionData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="positionLabel" tick={{ fontSize: 10 }} />
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
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as { status?: string } | undefined;
                      return `${label}${row?.status ? ` (${row.status})` : ''}`;
                    }}
                  />
                  <Bar
                    yAxisId="pnlDollar"
                    dataKey="totalGainLoss"
                    name="Portfolio Gain"
                    radius={[4, 4, 0, 0]}
                    onClick={(_, index) => {
                      const entry = holdingPeriodByPositionData[index];
                      if (!entry) {
                        return;
                      }
                      openHoldingPeriodDrilldown(entry);
                    }}
                  >
                    {holdingPeriodByPositionData.map((entry) => (
                      <Cell
                        key={`${entry.positionLabel}-pnl`}
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
                    <XAxis dataKey="rangeLabel" tick={{ fontSize: 10 }} interval={0} />
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
                    <XAxis dataKey="rangeLabel" tick={{ fontSize: 10 }} interval={0} />
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
                    <XAxis dataKey="symbol" tick={{ fontSize: 10 }} interval={0} />
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
                    <XAxis dataKey="rangeLabel" tick={{ fontSize: 10 }} interval={0} />
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
      )}

      <Dialog
        open={Boolean(selectedDrilldown)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDrilldown(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedHistogramTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedHistogramPositions.length} position{selectedHistogramPositions.length === 1 ? '' : 's'} in this bucket.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  {HISTOGRAM_DRILLDOWN_COLUMNS.map((column) => (
                    <TableHead key={column.id} className="border-r last:border-r-0">
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedHistogramPositions.length > 0 ? (
                  selectedHistogramPositions.map((position) => {
                    const realizedGainValue = calculateRealizedGainForPosition(position);
                    return (
                      <TableRow key={position.id} className="border-b even:bg-muted/20 hover:bg-muted/40 transition-colors">
                        {HISTOGRAM_DRILLDOWN_COLUMNS.map((column) => (
                          <TableCell
                            key={`${position.id}-${column.id}`}
                            className={cn(
                              column.id === 'symbol'
                                ? 'font-medium border-r font-mono sticky left-0 z-20 !bg-background'
                                : 'border-r font-mono',
                              column.id === HISTOGRAM_DRILLDOWN_COLUMNS[HISTOGRAM_DRILLDOWN_COLUMNS.length - 1]?.id && 'border-r-0',
                            )}
                          >
                            {renderHistogramDrilldownCell(column.id, position, realizedGainValue)}
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
                      No positions found for this bucket.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
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

function renderHistogramDrilldownCell(columnId: string, position: StockPosition, realizedGain: number) {
  const realizedPercent = position.netCost !== 0 ? (realizedGain / position.netCost) * 100 : null;

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
      return position.quantity;
    case 'cost':
      return <span className="font-medium">{formatCurrency(position.cost)}</span>;
    case 'netCost':
      return <span className="font-medium">{formatCurrency(position.netCost)}</span>;
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
    case 'rMultiple':
      return <RMultipleCell symbol={position.symbol} positions={[position]} />;
    case 'closedDate':
      return position.closedDate ? format(position.closedDate, 'MM/dd/yy') : <span className="text-muted-foreground">-</span>;
    case 'holdingPeriod': {
      if (!position.closedDate) {
        return <span className="text-muted-foreground">-</span>;
      }
      const daysHeld = calculateDaysInTrade(position.openDate, position.closedDate);
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
    () => positions.filter((position) => !isPositionFullyClosed(position) && position.remainingShares > 0),
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

      equity += markPrice * position.remainingShares;
      gainLoss += calculateGainLoss(markPrice, position.cost, position.remainingShares, position.type);
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
          return <TableCell key={col.id} className={cn(baseClass, "text-center")}>{summaryTotals.remainingShares}</TableCell>;
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
  const isOpen = positions.some((position) => !isPositionFullyClosed(position) && position.remainingShares > 0);

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
  const isOpen = positions.some((position) => !isPositionFullyClosed(position) && position.remainingShares > 0);

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

// Edit Position Modal Component
function EditPositionModal({
  position,
  isOpen,
  onClose,
  onSave,
  calculateRPriceTargets,
}: {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<StockPosition>) => Promise<void>;
  calculateRPriceTargets: (cost: number, stopLoss: number, type: 'Long' | 'Short') => { priceTarget2R: number; priceTarget5R: number };
}) {
  const [editSymbol, setEditSymbol] = useState<string>('');
  const [editCost, setEditCost] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editStopLoss, setEditStopLoss] = useState<string>('');
  const [editType, setEditType] = useState<'Long' | 'Short'>('Long');
  const [editOpenDate, setEditOpenDate] = useState<Date>(new Date());
  const [editClosedDate, setEditClosedDate] = useState<Date | undefined>(undefined);
  const [editPriceTarget2R, setEditPriceTarget2R] = useState<string>('');
  const [editPriceTarget2RShares, setEditPriceTarget2RShares] = useState<string>('');
  const [editPriceTarget5R, setEditPriceTarget5R] = useState<string>('');
  const [editPriceTarget5RShares, setEditPriceTarget5RShares] = useState<string>('');
  const [editPriceTarget21Day, setEditPriceTarget21Day] = useState<string>('');

  // Initialize form values when position changes
  useEffect(() => {
    if (position) {
      setEditSymbol(position.symbol);
      setEditCost(position.cost.toString());
      setEditQuantity(position.quantity.toString());
      setEditStopLoss(position.stopLoss.toString());
      setEditType(position.type);
      setEditOpenDate(position.openDate);
      setEditClosedDate(position.closedDate || undefined);
      setEditPriceTarget2R(position.priceTarget2R.toString());
      setEditPriceTarget2RShares(position.priceTarget2RShares.toString());
      setEditPriceTarget5R(position.priceTarget5R.toString());
      setEditPriceTarget5RShares(position.priceTarget5RShares.toString());
      setEditPriceTarget21Day(position.priceTarget21Day.toString());
    }
  }, [position]);

  const handleSave = async () => {
    if (!position || !editSymbol.trim() || !editCost.trim() || !editQuantity.trim()) {
      return;
    }

    const costValue = parseFloat(editCost);
    const quantityValue = parseFloat(editQuantity);
    const netCost = costValue * quantityValue;
    const stopLossValue = parseFloat(editStopLoss) || position.stopLoss;
    
    const priceTarget2RValue = parseFloat(editPriceTarget2R) || 0;
    const priceTarget2RSharesValue = parseFloat(editPriceTarget2RShares) || 0;
    const priceTarget5RValue = parseFloat(editPriceTarget5R) || 0;
    const priceTarget5RSharesValue = parseFloat(editPriceTarget5RShares) || 0;
    const priceTarget21DayValue = parseFloat(editPriceTarget21Day) || 0;

    const updates: Partial<StockPosition> = {
      symbol: editSymbol.trim().toUpperCase(),
      cost: costValue,
      quantity: quantityValue,
      netCost: netCost,
      stopLoss: stopLossValue,
      type: editType,
      openDate: editOpenDate,
      closedDate: editClosedDate || null,
      priceTarget2R: priceTarget2RValue,
      priceTarget2RShares: priceTarget2RSharesValue,
      priceTarget5R: priceTarget5RValue,
      priceTarget5RShares: priceTarget5RSharesValue,
      priceTarget21Day: priceTarget21DayValue,
    };

    try {
      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to update position:', error);
    }
  };

  const handleTypeChange = (value: 'Long' | 'Short') => {
    setEditType(value);
    if (position) {
      const costValue = parseFloat(editCost) || position.cost;
      const rTargets = calculateRPriceTargets(costValue, position.initialStopLoss, value);
      setEditPriceTarget2R(rTargets.priceTarget2R.toString());
      setEditPriceTarget5R(rTargets.priceTarget5R.toString());
    }
  };

  const handleCostChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    setEditCost(formattedValue);
    
    if (position && formattedValue) {
      const costValue = parseFloat(formattedValue);
      if (!isNaN(costValue)) {
        const rTargets = calculateRPriceTargets(costValue, position.initialStopLoss, editType);
        setEditPriceTarget2R(rTargets.priceTarget2R.toFixed(2));
        setEditPriceTarget5R(rTargets.priceTarget5R.toFixed(2));
      }
    }
  };

  const remainingShares = parseFloat(editQuantity) - parseFloat(editPriceTarget2RShares) - parseFloat(editPriceTarget5RShares);
  const netCostValue = parseFloat(editCost) * parseFloat(editQuantity);
  const editPosition = position ? {
    ...position,
    symbol: editSymbol,
    cost: parseFloat(editCost) || position.cost,
    quantity: parseFloat(editQuantity) || position.quantity,
    type: editType,
    priceTarget2R: parseFloat(editPriceTarget2R) || 0,
    priceTarget2RShares: parseFloat(editPriceTarget2RShares) || 0,
    priceTarget5R: parseFloat(editPriceTarget5R) || 0,
    priceTarget5RShares: parseFloat(editPriceTarget5RShares) || 0,
    priceTarget21Day: parseFloat(editPriceTarget21Day) || 0,
  } as StockPosition : null;

  const realizedGain = editPosition ? calculateRealizedGainForPosition(editPosition) : 0;

  // if (!position) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Position - {position?.symbol}</DialogTitle>
          <DialogDescription>
            Update the position details. Changes will be saved when you click Save.
          </DialogDescription>
        </DialogHeader>
        
        {position && (
        <div className="space-y-6 py-4">
          {/* Position Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Position Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Input
                  value={editSymbol}
                  disabled
                  className="bg-muted cursor-not-allowed font-semibold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={editType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Long">Long</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Open Date</label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(editOpenDate, "MM/dd/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <Calendar
                      mode="single"
                      selected={editOpenDate}
                      onSelect={(date) => date && setEditOpenDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Closed Date</label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editClosedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editClosedDate ? format(editClosedDate, "MM/dd/yyyy") : "Select date..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[60]" align="start">
                    <div className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mb-2"
                        onClick={() => {
                          setEditClosedDate(undefined);
                        }}
                      >
                        Clear Date
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={editClosedDate}
                      onSelect={(date) => {
                        setEditClosedDate(date);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Entry Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Entry Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost (Entry Price)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editCost}
                  onChange={(e) => handleCostChange(e.target.value)}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      setEditCost(numValue.toString());
                    }
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity (Shares)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editQuantity}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                    setEditQuantity(formattedValue);
                  }}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      setEditQuantity(numValue.toString());
                    }
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stop Loss (Current)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editStopLoss}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                    setEditStopLoss(formattedValue);
                  }}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    if (!isNaN(numValue)) {
                      setEditStopLoss(numValue.toString());
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Calculated Values */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Calculated Values</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Net Cost</label>
                <Input
                  value={formatCurrency(netCostValue)}
                  disabled
                  className="bg-muted/50 border-muted"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Remaining Shares</label>
                <Input
                  value={remainingShares >= 0 ? remainingShares.toString() : '0'}
                  disabled
                  className="bg-muted/50 border-muted"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Days in Trade</label>
                <Input
                  value={`${calculateDaysInTrade(editOpenDate, editClosedDate)} days`}
                  disabled
                  className="bg-muted/50 border-muted"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Stop Loss</label>
                <Input
                  value={formatCurrency(position.initialStopLoss)}
                  disabled
                  className="bg-muted/50 border-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Realized Gain</label>
                <Input
                  value={formatCurrency(realizedGain)}
                  disabled
                  className={cn(
                    "bg-muted/50 border-muted font-semibold",
                    realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Price Targets */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Price Targets & Exit Strategy</h3>
            
            {/* PT 1 */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium text-foreground">Price Target 1 (2R)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">PT 1 Price</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editPriceTarget2R}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setEditPriceTarget2R(formattedValue);
                      }}
                      onBlur={(e) => {
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue)) {
                          setEditPriceTarget2R(numValue.toString());
                        }
                      }}
                      placeholder="0.00"
                    />
                    {parseFloat(editPriceTarget2R) > 0 && (
                      <PercentageChange 
                        value={calculatePercentageChange(parseFloat(editPriceTarget2R), parseFloat(editCost) || position.cost)} 
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Shares Sold at PT 1</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editPriceTarget2RShares}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = value.split('.');
                      const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                      setEditPriceTarget2RShares(formattedValue);
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (!isNaN(numValue)) {
                        setEditPriceTarget2RShares(numValue.toString());
                      } else {
                        setEditPriceTarget2RShares('0');
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* PT 2 */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium text-foreground">Price Target 2 (5R)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">PT 2 Price</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editPriceTarget5R}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setEditPriceTarget5R(formattedValue);
                      }}
                      onBlur={(e) => {
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue)) {
                          setEditPriceTarget5R(numValue.toString());
                        }
                      }}
                      placeholder="0.00"
                    />
                    {parseFloat(editPriceTarget5R) > 0 && (
                      <PercentageChange 
                        value={calculatePercentageChange(parseFloat(editPriceTarget5R), parseFloat(editCost) || position.cost)} 
                        size="sm"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Shares Sold at PT 2</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editPriceTarget5RShares}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = value.split('.');
                      const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                      setEditPriceTarget5RShares(formattedValue);
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (!isNaN(numValue)) {
                        setEditPriceTarget5RShares(numValue.toString());
                      } else {
                        setEditPriceTarget5RShares('0');
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 21 Day Trail */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <h4 className="text-sm font-medium text-foreground">21 Day Trailing Stop Exit</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Final Exit Price</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editPriceTarget21Day}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                        setEditPriceTarget21Day(formattedValue);
                      }}
                      onBlur={(e) => {
                        const numValue = parseFloat(e.target.value);
                        if (!isNaN(numValue)) {
                          setEditPriceTarget21Day(numValue.toString());
                        }
                      }}
                      placeholder="0.00"
                    />
                    {parseFloat(editPriceTarget21Day) > 0 && (
                      <PercentageChange 
                        value={calculatePercentageChange(parseFloat(editPriceTarget21Day), parseFloat(editCost) || position.cost)} 
                        size="sm"
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-muted-foreground pb-2">
                    Exit price for remaining shares after PT1 and PT2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  } = usePortfolio();

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
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);
  const [tempPortfolioName, setTempPortfolioName] = useState<string>('');
  const [tempPortfolioValue, setTempPortfolioValue] = useState<string>('');
  
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
  
  // Position Percentage Calculator state
  const [adrPercent, setAdrPercent] = useState<string>('');

  // Create Portfolio state
  const [showCreatePortfolioDialog, setShowCreatePortfolioDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState<string>('');
  const [newPortfolioValue, setNewPortfolioValue] = useState<string>('');
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);
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

    // Calculate R-based price targets
    const rTargets = calculateRPriceTargets(costValue, stopLossValue, type);

    const newPosition: Omit<StockPosition, 'id'> = {
      symbol: symbol.trim().toUpperCase(),
      cost: costValue,
      quantity: quantityValue,
      netCost: netCost,
      initialStopLoss: stopLossValue,
      stopLoss: stopLossValue, // Initialize stopLoss to same value as initialStopLoss
      type: type,
      openDate: openDate,
      closedDate: null, // Initialize as null (position is open)
      priceTarget2R: rTargets.priceTarget2R,
      priceTarget2RShares: 0, // Initialize to 0
      priceTarget5R: rTargets.priceTarget5R,
      priceTarget5RShares: 0, // Initialize to 0
      priceTarget21Day: 0,
      remainingShares: quantityValue, // Initialize to full quantity (no shares trimmed yet)
      realizedGain: 0, // Initialize to 0 (no realized shares yet)
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

  const handleSaveEdit = async (updates: Partial<StockPosition>) => {
    if (!editingPosition) {
      return;
    }

    try {
      await updatePosition(editingPosition.id, updates);
      setEditingPosition(null);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update position:', error);
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
    setShowEditModal(false);
  };

  const handleDeletePosition = (position: StockPosition) => {
    setPositionToDelete(position);
    setShowDeleteDialog(true);
  };

  const confirmDeletePosition = async () => {
    if (!positionToDelete) return;
    
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
    setIsEditingPortfolio(true);
    setTempPortfolioName(portfolioName);
    setTempPortfolioValue(portfolioValue);
  };

  const handleSavePortfolio = async () => {
    setPortfolioName(tempPortfolioName);
    setPortfolioValue(tempPortfolioValue);
    const numValue = parseFloat(tempPortfolioValue) || 0;
    try {
      await updatePortfolio(tempPortfolioName, numValue);
      setIsEditingPortfolio(false);
    } catch (error) {
      console.error('Failed to update portfolio:', error);
    }
  };

  const handleCancelPortfolioEdit = () => {
    setIsEditingPortfolio(false);
    setTempPortfolioName(portfolioName);
    setTempPortfolioValue(portfolioValue);
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

    if (!sortColumn) {
      return basePositions;
    }

    basePositions.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortColumn) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'price':
          aValue = a.currentPrice || 0;
          bValue = b.currentPrice || 0;
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
          aValue = a.remainingShares;
          bValue = b.remainingShares;
          break;
        case 'netCost':
          aValue = a.netCost;
          bValue = b.netCost;
          break;
        case 'equity':
          aValue = (a.currentPrice || a.cost) * a.remainingShares;
          bValue = (b.currentPrice || b.cost) * b.remainingShares;
          break;
        case 'gainLoss':
          aValue = calculateGainLoss(a.currentPrice || a.cost, a.cost, a.remainingShares, a.type);
          bValue = calculateGainLoss(b.currentPrice || b.cost, b.cost, b.remainingShares, b.type);
          break;
        case 'portfolioGain':
          aValue = currentPortfolioValue > 0
            ? (calculateProjectedGainForPosition(a, a.currentPrice) / currentPortfolioValue) * 100
            : 0;
          bValue = currentPortfolioValue > 0
            ? (calculateProjectedGainForPosition(b, b.currentPrice) / currentPortfolioValue) * 100
            : 0;
          break;
        case 'realizedGain':
          aValue = a.realizedGain || 0;
          bValue = b.realizedGain || 0;
          break;
        case 'rMultiple':
          aValue = calculateDisplayedRMultipleForPosition(a, a.currentPrice);
          bValue = calculateDisplayedRMultipleForPosition(b, b.currentPrice);
          break;
        case 'portfolioPercent':
          const aEquity = (a.currentPrice || a.cost) * a.remainingShares;
          const bEquity = (b.currentPrice || b.cost) * b.remainingShares;
          const totalValue = portfolio?.portfolio_value || 1;
          aValue = (aEquity / totalValue) * 100;
          bValue = (bEquity / totalValue) * 100;
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
          aValue = hasConfiguredStopLoss(a.cost, a.stopLoss)
            ? ((a.stopLoss - a.cost) / a.cost) * 100
            : 0;
          bValue = hasConfiguredStopLoss(b.cost, b.stopLoss)
            ? ((b.stopLoss - b.cost) / b.cost) * 100
            : 0;
          break;
        case 'openHeat':
          const aRisk = hasConfiguredStopLoss(a.cost, a.stopLoss)
            ? ((a.stopLoss - a.cost) / a.cost) * 100
            : 0;
          const bRisk = hasConfiguredStopLoss(b.cost, b.stopLoss)
            ? ((b.stopLoss - b.cost) / b.cost) * 100
            : 0;
          const aPortPercent = ((a.currentPrice || a.cost) * a.remainingShares / (portfolio?.portfolio_value || 1)) * 100;
          const bPortPercent = ((b.currentPrice || b.cost) * b.remainingShares / (portfolio?.portfolio_value || 1)) * 100;
          aValue = (aRisk * aPortPercent) / 100;
          bValue = (bRisk * bPortPercent) / 100;
          break;
        case 'priceTarget2R':
          aValue = a.priceTarget2R;
          bValue = b.priceTarget2R;
          break;
        case 'priceTarget2RShares':
          aValue = a.priceTarget2RShares;
          bValue = b.priceTarget2RShares;
          break;
        case 'priceTarget5R':
          aValue = a.priceTarget5R;
          bValue = b.priceTarget5R;
          break;
        case 'priceTarget5RShares':
          aValue = a.priceTarget5RShares;
          bValue = b.priceTarget5RShares;
          break;
        case 'priceTarget21Day':
          aValue = a.priceTarget21Day;
          bValue = b.priceTarget21Day;
          break;
        case 'openDate':
          aValue = a.openDate.getTime();
          bValue = b.openDate.getTime();
          break;
        case 'closedDate':
          aValue = a.closedDate?.getTime() || 0;
          bValue = b.closedDate?.getTime() || 0;
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

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        const stringComparison = String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? stringComparison : -stringComparison;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return basePositions;
  }, [filteredPositions, sortColumn, sortDirection, portfolio?.portfolio_value, portfolioValue]);

  // Filter positions based on closed status (memoized to prevent unnecessary recalculations)
  const closedPositions = useMemo(() => positions.filter(pos => pos.closedDate), [positions]);

  const openPositionsForAllocation = useMemo(
    () => positions.filter((p) => !isPositionFullyClosed(p) && p.remainingShares > 0),
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
      const remainingShares = grouped.reduce((sum, p) => sum + p.remainingShares, 0);
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
      totalRemainingShares += position.remainingShares;
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

  const totalOpenRiskDollar = useMemo(() => calculateTotalOpenRisk(positions), [positions]);
  const totalOpenRiskPercentOfPortfolio =
    portfolioValueNumber > 0 ? (totalOpenRiskDollar / portfolioValueNumber) * 100 : 0;

  // Compute trade statistics from closed positions only
  const tradeStatistics = useMemo(() => {
    if (closedPositions.length === 0 || portfolioValueNumber <= 0) return null;

    const trades = closedPositions.map(pos => {
      const realizedGain = calculateRealizedGainForPosition(pos);
      const percentGain = pos.netCost !== 0 ? (realizedGain / pos.netCost) * 100 : 0;
      const equityContribution = (realizedGain / portfolioValueNumber) * 100;
      const days = calculateDaysInTrade(pos.openDate, pos.closedDate);
      const initialRisk = calculateInitialRiskAmount(pos.cost, pos.initialStopLoss, pos.quantity);
      const rMultiple = initialRisk > 0 ? realizedGain / initialRisk : 0;
      return { realizedGain, percentGain, equityContribution, days, rMultiple, netCost: pos.netCost };
    });

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
    const totalR = r2(trades.reduce((sum, trade) => sum + trade.rMultiple, 0));
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
      totalR,
      avgEquityPerTrade,
      avgNetCost,
      avgWinnerDays,
      avgLoserDays,
      riskRewardRatio,
    };
  }, [closedPositions, portfolioValueNumber]);

  const allocationSummary = useMemo(() => {
    const equityBySymbol = new Map<string, number>();
    for (let i = 0; i < openPositionsForAllocation.length; i += 1) {
      const position = openPositionsForAllocation[i];
      const quotePrice = allocationQuoteQueries[i]?.data?.price;
      const markPrice = typeof quotePrice === 'number' ? quotePrice : position.cost;
      const equity = markPrice * position.remainingShares;
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

    setIsEditingPortfolio(false);
    setEditingPosition(null);
    setPositionToDelete(null);
    setShowDeleteDialog(false);
    void selectPortfolio(parsed);
  };

  const handleTabChange = (value: string) => {
    if (value === 'positions' || value === 'stats') {
      setActiveTab(value);
    }
  };

  return (
    <div className="w-full p-3 sm:p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="space-y-3">
          <PortfolioToolbar
            portfolios={portfolios}
            selectedPortfolioKey={selectedPortfolioKey}
            handlePortfolioSelection={handlePortfolioSelection}
            isPortfolioLoading={isPortfolioLoading}
            defaultPortfolioKey={defaultPortfolioKey}
            setPortfolioAsDefault={setPortfolioAsDefault}
            handleOpenCreatePortfolio={handleOpenCreatePortfolio}
            handleEditPortfolio={handleEditPortfolio}
            isEditingPortfolio={isEditingPortfolio}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
          />

          <TabsContent value="positions">
            <div className="flex flex-col xl:flex-row gap-3">
              <div className="flex-1 min-w-0 space-y-3">
                {/* Positions Table Card */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden p-2.5 sm:p-3">
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
                    variant={showClosedPositions ? "secondary" : "ghost"}
                    onClick={() => setShowClosedPositions(!showClosedPositions)}
                    disabled={closedPositions.length === 0}
                    className="h-8 text-xs"
                  >
                    {showClosedPositions ? "Hide" : "Show"} Closed ({closedPositions.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={summarizeOpenPositions ? "secondary" : "ghost"}
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
            <div className="overflow-x-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
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
                  <TableHeader>
                    <TableRow className="border-b-2">
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
                            case 'symbol':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? (
                                    <span className="inline-flex items-center gap-2">
                                      <span>{row.symbol}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Summary</span>
                                    </span>
                                  ) : (
                                    position.symbol
                                  )}
                                </TableCell>
                              );
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
                                      : (position.priceTarget21Day > 0 ? '0' : position.remainingShares)}
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
                                    quantity={isSummaryRow ? row.remainingShares : (position.priceTarget21Day > 0 ? 0 : position.remainingShares)}
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
                                      quantity={position.remainingShares}
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
                                    quantity={isSummaryRow ? row.remainingShares : (position.priceTarget21Day > 0 ? 0 : position.remainingShares)}
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
                            case 'priceTarget2R':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      <span>{position.priceTarget2R > 0 ? formatCurrency(position.priceTarget2R) : '-'}</span>
                                      {position.priceTarget2R > 0 && (
                                        <span className={cn(
                                          "text-xs font-medium",
                                          getSignedPercentColorClass(calculatePercentageChange(position.priceTarget2R, position.cost))
                                        )}>
                                          {formatSignedPercent(calculatePercentageChange(position.priceTarget2R, position.cost))}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            case 'priceTarget2RShares':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? '-' : <span className="font-medium">{position.priceTarget2RShares || 0}</span>}</TableCell>;
                            case 'priceTarget5R':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      <span>{position.priceTarget5R > 0 ? formatCurrency(position.priceTarget5R) : '-'}</span>
                                      {position.priceTarget5R > 0 && (
                                        <span className={cn(
                                          "text-xs font-medium",
                                          getSignedPercentColorClass(calculatePercentageChange(position.priceTarget5R, position.cost))
                                        )}>
                                          {formatSignedPercent(calculatePercentageChange(position.priceTarget5R, position.cost))}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            case 'priceTarget5RShares':
                              return <TableCell key={col.id} className={baseCellClass}>{isSummaryRow ? '-' : <span className="font-medium">{position.priceTarget5RShares || 0}</span>}</TableCell>;
                            case 'priceTarget21Day':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  {isSummaryRow ? '-' : (
                                    <div className="flex flex-col gap-0.5">
                                      <span>{position.priceTarget21Day > 0 ? formatCurrency(position.priceTarget21Day) : '-'}</span>
                                      {position.priceTarget21Day > 0 && (
                                        <span className={cn(
                                          "text-xs font-medium",
                                          getSignedPercentColorClass(calculatePercentageChange(position.priceTarget21Day, position.cost))
                                        )}>
                                          {formatSignedPercent(calculatePercentageChange(position.priceTarget21Day, position.cost))}
                                        </span>
                                      )}
                                    </div>
                                  )}
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
                                  ) : (
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
        <aside className="w-full xl:w-80 shrink-0 space-y-2.5">
          {/* ADR & max position (portfolio value) */}
          <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="px-3 py-2.5 text-sm font-semibold border-b border-border/50">
              Max Position based on ADR
            </div>
            <div className="px-3 pb-3 pt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ADR %</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="2.50"
                  value={adrPercent}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    const formattedValue = parts.length > 2
                      ? parts[0] + '.' + parts.slice(1).join('')
                      : value;
                    if (parts.length === 2 && parts[1].length > 2) return;
                    setAdrPercent(formattedValue);
                  }}
                  className="h-8 w-full text-sm font-mono bg-background/50"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Max Position %</p>
                  <p className="text-sm font-bold font-mono">
                    {adrPercent && parseFloat(adrPercent) > 0 ? `${((1 / parseFloat(adrPercent)) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Max Amount</p>
                  <p className="text-sm font-bold font-mono">
                    {adrPercent && parseFloat(adrPercent) > 0
                      ? formatCurrencyTwoDecimals((parseFloat(portfolioValue) || 0) * (1 / parseFloat(adrPercent)))
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Add Position Panel */}
          <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="px-3 py-2.5 text-sm font-semibold border-b border-border/50">
              + Add Position
            </div>
            <div className="px-3 pb-3 pt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Input
                    type="text"
                    placeholder={positionInstrument === 'option' ? 'AAPL240621C00180000' : 'AAPL'}
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="h-8 text-sm font-mono bg-background/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={type} onValueChange={(value: 'Long' | 'Short') => setType(value)}>
                    <SelectTrigger className="h-8 text-sm bg-background/50">
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
                <Select value={positionInstrument} onValueChange={(value: 'stock' | 'option') => setPositionInstrument(value)}>
                  <SelectTrigger className="h-8 text-sm bg-background/50">
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
                  className="h-8 text-sm font-mono bg-background/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Open Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
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
          </div>

          {/* Allocation Panel */}
          <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="px-3 py-2.5 text-sm font-semibold border-b border-border/50">
              Allocation
            </div>
            <div className="px-3 pb-3 pt-3">
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
          </div>

        </aside>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <PortfolioHero
              portfolioName={portfolioName}
              portfolioValue={portfolio?.portfolio_value ?? (portfolioValue ? parseFloat(portfolioValue) : 0)}
              positions={positions}
              isLoading={isPortfolioLoading}
              isEditingPortfolio={isEditingPortfolio}
              tempPortfolioName={tempPortfolioName}
              tempPortfolioValue={tempPortfolioValue}
              setTempPortfolioName={setTempPortfolioName}
              setTempPortfolioValue={setTempPortfolioValue}
              handleSavePortfolio={handleSavePortfolio}
              handleCancelPortfolioEdit={handleCancelPortfolioEdit}
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
        onSave={handleSaveEdit}
        calculateRPriceTargets={calculateRPriceTargets}
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
    </div>
  );
}
