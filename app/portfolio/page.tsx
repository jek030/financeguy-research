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
import { CalendarIcon, InfoIcon, X, Loader2, Pencil, ChevronUp, ChevronDown, PlusCircle, Star } from 'lucide-react';
import { SortableHeader } from '@/components/ui/SortableHeader';
import { useSortableTable } from '@/hooks/useSortableTable';
import { ColumnSettingsPopover } from '@/components/ui/ColumnSettingsPopover';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
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

const calculateOpenRiskAmount = (cost: number, stopLoss: number, quantity: number) => {
  if (quantity <= 0) {
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
  { id: 'realizedGain', label: 'Realized $' },
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

// Calculate total open risk helper
function calculateTotalOpenRisk(positions: StockPosition[]): number {
  return positions
    .filter(pos => !pos.closedDate && pos.remainingShares > 0)
    .reduce((total, pos) => {
      const riskAmount = Math.abs(pos.cost - pos.stopLoss) * pos.remainingShares;
      return total + riskAmount;
    }, 0);
}

// Portfolio Hero Section Component
interface PortfolioHeroProps {
  portfolioName: string;
  portfolioValue: number;
  positions: StockPosition[];
  isEditingPortfolio: boolean;
  tempPortfolioName: string;
  tempPortfolioValue: string;
  setTempPortfolioName: (value: string) => void;
  setTempPortfolioValue: (value: string) => void;
  handleSavePortfolio: () => void;
  handleCancelPortfolioEdit: () => void;
  symbolFilters: string[];
  symbolFilterInput: string;
  setSymbolFilterInput: (value: string) => void;
  handleSymbolFilterKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeSymbolFilter: (symbol: string) => void;
  clearAllSymbolFilters: () => void;
  portfolios: Array<{ portfolio_key: number | string; portfolio_name: string }>;
  selectedPortfolioKey: number | null;
  handlePortfolioSelection: (value: string) => void;
  isPortfolioLoading: boolean;
  defaultPortfolioKey: number | null;
  setPortfolioAsDefault: (key: number | null) => void;
  handleOpenCreatePortfolio: () => void;
  handleEditPortfolio: () => void;
  showClosedPositions: boolean;
  setShowClosedPositions: (value: boolean) => void;
  summarizeOpenPositions: boolean;
  setSummarizeOpenPositions: (value: boolean) => void;
  canSummarizeOpenPositions: boolean;
  closedPositionsCount: number;
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
    avgWinnerDays: number;
    avgLoserDays: number;
    riskRewardRatio: number;
  } | null;
}

function PortfolioHero({
  portfolioName,
  portfolioValue,
  positions,
  isEditingPortfolio,
  tempPortfolioName,
  tempPortfolioValue,
  setTempPortfolioName,
  setTempPortfolioValue,
  handleSavePortfolio,
  handleCancelPortfolioEdit,
  symbolFilters,
  symbolFilterInput,
  setSymbolFilterInput,
  handleSymbolFilterKeyDown,
  removeSymbolFilter,
  clearAllSymbolFilters,
  portfolios,
  selectedPortfolioKey,
  handlePortfolioSelection,
  isPortfolioLoading,
  defaultPortfolioKey,
  setPortfolioAsDefault,
  handleOpenCreatePortfolio,
  handleEditPortfolio,
  showClosedPositions,
  setShowClosedPositions,
  summarizeOpenPositions,
  setSummarizeOpenPositions,
  canSummarizeOpenPositions,
  closedPositionsCount,
  tradeStatistics,
}: PortfolioHeroProps) {
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
  const exposureColorClass = exposure > 100 
    ? "text-red-400" 
    : exposure > 80 
      ? "text-yellow-400" 
      : "text-emerald-400";
  
  const exposureBarColor = exposure > 100 
    ? "bg-red-500" 
    : exposure > 80 
      ? "bg-yellow-500" 
      : "bg-emerald-500";
  
  // Risk color logic  
  const riskColorClass = riskPercent > 10 
    ? "text-red-400" 
    : riskPercent > 5 
      ? "text-orange-400" 
      : "text-emerald-400";
      
  const riskBarColor = riskPercent > 10 
    ? "bg-red-500" 
    : riskPercent > 5 
      ? "bg-orange-500" 
      : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selectedPortfolioKey !== null ? String(selectedPortfolioKey) : undefined}
            onValueChange={handlePortfolioSelection}
            disabled={isPortfolioLoading || portfolios.length === 0}
          >
            <SelectTrigger className="w-[200px] h-8 text-sm bg-background/50" aria-label="Select portfolio">
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
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {symbolFilters.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {symbol}
                <button
                  type="button"
                  onClick={() => removeSymbolFilter(symbol)}
                  className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-primary/20 transition-colors"
                  aria-label={`Remove ${symbol} filter`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <Input
              value={symbolFilterInput}
              onChange={(e) => setSymbolFilterInput(e.target.value.toUpperCase())}
              onKeyDown={handleSymbolFilterKeyDown}
              placeholder={symbolFilters.length > 0 ? "Add..." : "Filter"}
              aria-label="Filter positions by symbol"
              className="w-20 h-7 text-xs bg-background/50"
            />
            {symbolFilters.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllSymbolFilters}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>
          <Button 
            size="sm" 
            variant={showClosedPositions ? "secondary" : "ghost"}
            onClick={() => setShowClosedPositions(!showClosedPositions)}
            disabled={closedPositionsCount === 0}
            className="h-7 text-xs"
          >
            {showClosedPositions ? "Hide" : "Show"} Closed ({closedPositionsCount})
          </Button>
          <Button
            size="sm"
            variant={summarizeOpenPositions ? "secondary" : "ghost"}
            onClick={() => setSummarizeOpenPositions(!summarizeOpenPositions)}
            disabled={!canSummarizeOpenPositions}
            className="h-7 text-xs"
          >
            {summarizeOpenPositions ? "Show Individual" : "Summarize Symbols"}
          </Button>
        </div>
      </div>

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
        <div className="p-5 md:p-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            {portfolioName}
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr_1fr] gap-4 mb-6">
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Starting Balance
              </p>
              <p className="text-3xl md:text-4xl font-bold font-mono tracking-tight">
                {formatCurrency(portfolioValue)}
              </p>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Current Balance
              </p>
              {isUnrealizedLoading ? (
                <div className="h-10 w-40 bg-muted animate-pulse rounded" />
              ) : (
                <p className={cn(
                  "text-3xl font-bold font-mono tracking-tight",
                  currentBalance >= portfolioValue ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
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

            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 md:p-5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Unrealized Balance
              </p>
              {isUnrealizedLoading ? (
                <div className="h-10 w-40 bg-muted animate-pulse rounded" />
              ) : (
                <p className={cn(
                  "text-3xl font-bold font-mono tracking-tight",
                  unrealizedBalance >= portfolioValue ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
            <div className="rounded-lg border border-border/60 bg-background/30 p-3.5">
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
            <div className="rounded-lg border border-border/60 bg-background/30 p-3.5">
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
            <div className="rounded-lg border border-border/60 bg-background/30 p-3.5 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Unrealized P&L
              </p>
              <div className="text-lg font-bold font-mono">
                {isUnrealizedLoading ? (
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                ) : (
                  <span className={cn(
                    unrealizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
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
            <div className="rounded-lg border border-border/60 bg-background/30 p-3.5 space-y-2">
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
            <div className="mt-6 pt-6 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Trade Statistics</p>
              
              {/* Top row: Batting Average, Risk/Reward, Avg Duration */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Batting Average</p>
                  <p className={cn(
                    "text-lg font-bold font-mono",
                    tradeStatistics.battingAverage >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {tradeStatistics.battingAverage.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tradeStatistics.winnerCount}W / {tradeStatistics.loserCount}L of {tradeStatistics.totalClosed}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Risk / Reward</p>
                  <p className={cn(
                    "text-lg font-bold font-mono",
                    tradeStatistics.riskRewardRatio >= 1 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {tradeStatistics.riskRewardRatio > 0 ? tradeStatistics.riskRewardRatio.toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Avg gain / Avg loss</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Avg Winner Duration</p>
                  <p className="text-lg font-bold font-mono">{tradeStatistics.avgWinnerDays.toFixed(1)}d</p>
                  <p className="text-[10px] text-muted-foreground">Days in trade</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Avg Loser Duration</p>
                  <p className="text-lg font-bold font-mono">{tradeStatistics.avgLoserDays.toFixed(1)}d</p>
                  <p className="text-[10px] text-muted-foreground">Days in trade</p>
                </div>
              </div>

              {/* Gain/Loss detail grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Average Gain */}
                <div className="rounded-lg border border-border/50 bg-background/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Average Gain</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Dollar</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(tradeStatistics.avgGainDollar)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Percent</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{tradeStatistics.avgGainPercent.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Equity Contribution</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{tradeStatistics.avgGainEquity.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* Average Loss */}
                <div className="rounded-lg border border-border/50 bg-background/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Average Loss</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Dollar</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{formatCurrency(tradeStatistics.avgLossDollar)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Percent</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{tradeStatistics.avgLossPercent.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Equity Contribution</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{tradeStatistics.avgLossEquity.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* Max Gain */}
                <div className="rounded-lg border border-border/50 bg-background/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Max Gain</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Dollar</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{formatCurrency(tradeStatistics.maxGainDollar)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Percent</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{tradeStatistics.maxGainPercent.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Equity Contribution</p>
                      <p className="text-xs font-bold font-mono text-green-600 dark:text-green-400">{tradeStatistics.maxGainEquity.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                {/* Max Loss */}
                <div className="rounded-lg border border-border/50 bg-background/30 p-3">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Max Loss</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Dollar</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{formatCurrency(tradeStatistics.maxLossDollar)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Percent</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{tradeStatistics.maxLossPercent.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Equity Contribution</p>
                      <p className="text-xs font-bold font-mono text-red-600 dark:text-red-400">-{tradeStatistics.maxLossEquity.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsible Panel Component
interface CollapsiblePanelProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

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

function CollapsiblePanel({ title, defaultOpen = false, children }: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30 transition-colors"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  );
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

    for (const position of closedPositions) {
      gainLoss += calculateRealizedGainForPosition(position);
    }

    for (let index = 0; index < openPositions.length; index += 1) {
      const position = openPositions[index];
      const currentPrice = quoteQueries[index]?.data?.price;
      if (typeof currentPrice !== 'number') {
        continue;
      }

      equity += currentPrice * position.remainingShares;
      gainLoss += calculateGainLoss(currentPrice, position.cost, position.remainingShares, position.type);
    }

    return { equity, gainLoss };
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
  const [symbolFilters, setSymbolFilters] = useState<string[]>(() => {
    // Initialize from localStorage on first render
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('financeguy-symbol-filters');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
    return [];
  });
  
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

  // Initialize portfolio value and name from database
  useEffect(() => {
    if (portfolio) {
      setPortfolioValue(portfolio.portfolio_value.toString());
      setPortfolioName(portfolio.portfolio_name || 'My Portfolio');
    }
  }, [portfolio]);

  // Save symbol filters to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('financeguy-symbol-filters', JSON.stringify(symbolFilters));
      } catch {
        // Ignore storage write errors
      }
    }
  }, [symbolFilters]);

  // Add a symbol to the filter list
  const addSymbolFilter = (symbol: string) => {
    const normalized = symbol.trim().toUpperCase();
    if (normalized && !symbolFilters.includes(normalized)) {
      setSymbolFilters(prev => [...prev, normalized]);
    }
    setSymbolFilterInput('');
  };

  // Remove a symbol from the filter list
  const removeSymbolFilter = (symbol: string) => {
    setSymbolFilters(prev => prev.filter(s => s !== symbol));
  };

  // Clear all symbol filters
  const clearAllSymbolFilters = () => {
    setSymbolFilters([]);
  };

  // Handle Enter key in symbol filter input
  const handleSymbolFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSymbolFilter(symbolFilterInput);
    }
  };

  const handleAddStock = async () => {
    if (!symbol.trim() || !cost.trim() || !quantity.trim() || !initialStopLoss.trim()) {
      return;
    }

    const costValue = parseFloat(cost);
    const quantityValue = parseFloat(quantity);
    const stopLossValue = parseFloat(initialStopLoss);
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
      setType('Long');
      setOpenDate(new Date());
    } catch (error) {
      console.error('Failed to add position:', error);
      // You could add a toast notification here
    }
  };

  const isAddButtonDisabled = !symbol.trim() || !cost.trim() || !quantity.trim() || !initialStopLoss.trim();


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
    if (symbolFilters.length === 0) {
      return positions;
    }

    // Exact match against any of the symbols in the filter list
    return positions.filter((pos) => 
      symbolFilters.includes(pos.symbol.toUpperCase())
    );
  }, [positions, symbolFilters]);

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
        case 'realizedGain':
          aValue = a.realizedGain || 0;
          bValue = b.realizedGain || 0;
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
          aValue = ((a.stopLoss - a.cost) / a.cost) * 100;
          bValue = ((b.stopLoss - b.cost) / b.cost) * 100;
          break;
        case 'openHeat':
          const aRisk = ((a.stopLoss - a.cost) / a.cost) * 100;
          const bRisk = ((b.stopLoss - b.cost) / b.cost) * 100;
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
  }, [filteredPositions, sortColumn, sortDirection, portfolio?.portfolio_value]);

  // Filter positions based on closed status (memoized to prevent unnecessary recalculations)
  const openPositions = useMemo(() => positions.filter(pos => !pos.closedDate), [positions]);
  const closedPositions = useMemo(() => positions.filter(pos => pos.closedDate), [positions]);
  
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

  // Compute trade statistics from closed positions only
  const tradeStatistics = useMemo(() => {
    if (closedPositions.length === 0 || portfolioValueNumber <= 0) return null;

    const trades = closedPositions.map(pos => {
      const realizedGain = calculateRealizedGainForPosition(pos);
      const percentGain = pos.netCost !== 0 ? (realizedGain / pos.netCost) * 100 : 0;
      const equityContribution = (realizedGain / portfolioValueNumber) * 100;
      const days = calculateDaysInTrade(pos.openDate, pos.closedDate);
      return { realizedGain, percentGain, equityContribution, days };
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

    const avgWinnerDays = r2(avg(winners.map(t => t.days)));
    const avgLoserDays = r2(avg(losers.map(t => t.days)));

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
      avgWinnerDays,
      avgLoserDays,
      riskRewardRatio,
    };
  }, [closedPositions, portfolioValueNumber]);

  const allocationSummary = useMemo(() => {
    const slices = openPositions.map((position) => {
      const price = position.currentPrice ?? position.cost;
      const equity = price * position.remainingShares;
      return {
        name: position.symbol,
        value: equity,
      };
    }).filter((item) => item.value > 0);

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
  }, [openPositions, portfolioValueNumber]);

  const hasPositions = positions.length > 0;
  const hasDisplayedPositions = tableRows.length > 0;
  const allocationSlices = allocationSummary.slices;
  const totalAllocation = allocationSummary.total;
  const openEquityValue = allocationSummary.openEquity;
  const cashAllocationValue = allocationSummary.cashValue;

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

  // Show loading state
  if (isAuthLoading || isPortfolioLoading) {
    return (
      <div className="w-full p-4 sm:p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading portfolio...</span>
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

  return (
    <div className="w-full p-4 min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Portfolio Hero */}
          <PortfolioHero
            portfolioName={portfolioName}
            portfolioValue={portfolio?.portfolio_value ?? (portfolioValue ? parseFloat(portfolioValue) : 0)}
            positions={positions}
            isEditingPortfolio={isEditingPortfolio}
            tempPortfolioName={tempPortfolioName}
            tempPortfolioValue={tempPortfolioValue}
            setTempPortfolioName={setTempPortfolioName}
            setTempPortfolioValue={setTempPortfolioValue}
            handleSavePortfolio={handleSavePortfolio}
            handleCancelPortfolioEdit={handleCancelPortfolioEdit}
            symbolFilters={symbolFilters}
            symbolFilterInput={symbolFilterInput}
            setSymbolFilterInput={setSymbolFilterInput}
            handleSymbolFilterKeyDown={handleSymbolFilterKeyDown}
            removeSymbolFilter={removeSymbolFilter}
            clearAllSymbolFilters={clearAllSymbolFilters}
            portfolios={portfolios}
            selectedPortfolioKey={selectedPortfolioKey}
            handlePortfolioSelection={handlePortfolioSelection}
            isPortfolioLoading={isPortfolioLoading}
            defaultPortfolioKey={defaultPortfolioKey}
            setPortfolioAsDefault={setPortfolioAsDefault}
            handleOpenCreatePortfolio={handleOpenCreatePortfolio}
            handleEditPortfolio={handleEditPortfolio}
            showClosedPositions={showClosedPositions}
            setShowClosedPositions={setShowClosedPositions}
            summarizeOpenPositions={summarizeOpenPositions}
            setSummarizeOpenPositions={setSummarizeOpenPositions}
            canSummarizeOpenPositions={canSummarizeOpenPositions}
            closedPositionsCount={closedPositions.length}
            tradeStatistics={tradeStatistics}
          />

          {/* Positions Table Card */}
          <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden p-4">
            <div className="overflow-x-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
              {hasPositions && hasDisplayedPositions ? (
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
                            case 'realizedGain':
                              return (
                                <TableCell key={col.id} className={baseCellClass}>
                                  <span className={cn("font-medium", realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-400")}>
                                    {formatCurrency(realizedGain)}
                                  </span>
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
                  {hasPositions ? "No positions match the current filter." : "No positions yet. Add a stock position to get started."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-full xl:w-80 shrink-0 space-y-4">
          {/* Add Position Panel */}
          <CollapsiblePanel title="+ Add Position" defaultOpen={true}>
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Symbol</label>
                  <Input
                    type="text"
                    placeholder="AAPL"
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
                  <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
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
                <label className="text-xs font-medium text-muted-foreground">Initial Stop Loss</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
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
          </CollapsiblePanel>

          {/* Calculator Panel */}
          <CollapsiblePanel title="Position Calculator" defaultOpen={false}>
            <div className="pt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">ADR %</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g., 2.50"
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
                  className="h-8 text-sm font-mono bg-background/50"
                />
              </div>
              {adrPercent && parseFloat(adrPercent) > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Max Position %</p>
                    <p className="text-lg font-bold font-mono">
                      {((1 / parseFloat(adrPercent)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Max Amount</p>
                    <p className="text-lg font-bold font-mono">
                      {formatCurrency((parseFloat(portfolioValue) || 0) * (1 / parseFloat(adrPercent)))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CollapsiblePanel>

          {/* Allocation Panel */}
          <CollapsiblePanel title="Allocation" defaultOpen={false}>
            <div className="pt-4">
              {allocationSummary.total === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No allocation data</p>
              ) : (
                <div className="space-y-4">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={allocationSlices}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={3}
                          stroke="transparent"
                        >
                          {allocationSlices.map((slice, index) => (
                            <Cell key={slice.name} fill={allocationColors[index % allocationColors.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={renderAllocationTooltip} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Open Equity</p>
                      <p className="text-sm font-bold font-mono">{formatCurrency(openEquityValue)}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/50 p-2">
                      <p className="text-[10px] text-muted-foreground uppercase">Cash</p>
                      <p className="text-sm font-bold font-mono">{formatCurrency(cashAllocationValue)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsiblePanel>

        </aside>
      </div>

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
