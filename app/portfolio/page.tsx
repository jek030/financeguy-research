'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { CalendarIcon, InfoIcon, X, Loader2, Pencil, ChevronUp, ChevronDown, PlusCircle, Star } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { PercentageChange } from '@/components/ui/PriceIndicator';
import { useQuote } from '@/hooks/FMP/useQuote';
import { usePortfolio, type StockPosition } from '@/hooks/usePortfolio';
import { useAuth } from '@/lib/context/auth-context';
import Link from 'next/link';
import { pageStyles } from '@/components/ui/CompanyHeader';

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 10,
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

// Helper function to calculate gain/loss
const calculateGainLoss = (currentPrice: number, cost: number, quantity: number, type: 'Long' | 'Short') => {
  if (type === 'Long') {
    return (currentPrice - cost) * quantity;
  } else {
    // For short positions: gain when price goes down (cost > currentPrice)
    return (cost - currentPrice) * quantity;
  }
};

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
      <PercentageChange 
        value={quote.changesPercentage} 
        size="sm"
      />
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
      <PercentageChange 
        value={displayPercent} 
        size="sm"
      />
    </div>
  );
}

// Component to display realized gain/loss from closed positions
function RealizedGainDisplay({ positions }: { positions: StockPosition[] }) {
  const [realizedGain, setRealizedGain] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateRealizedGain = () => {
      setIsCalculating(true);
      let total = 0;

      for (const position of positions) {
        // Include positions that have any realized shares
        // (priceTarget2RShares, priceTarget5RShares, or priceTarget21Day > 0)
        const hasRealizedShares = 
          (position.priceTarget2RShares > 0 && position.priceTarget2R > 0) ||
          (position.priceTarget5RShares > 0 && position.priceTarget5R > 0) ||
          (position.priceTarget21Day > 0);
        
        if (!hasRealizedShares) continue;

        // Calculate realized gain based on actual exit prices from database
        const positionGain = calculateRealizedGainForPosition(position);
        total += positionGain;
      }

      setRealizedGain(total);
      setIsCalculating(false);
    };

    calculateRealizedGain();
  }, [positions]);

  if (isCalculating) {
    return (
      <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
    );
  }

  if (realizedGain === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  return (
    <span className={cn(
      "font-medium",
      realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    )}>
      {formatCurrency(realizedGain)}
    </span>
  );
}

// Component to display total unrealized gain/loss for open positions
function UnrealizedGainDisplay({ positions }: { positions: StockPosition[] }) {
  const [totalGain, setTotalGain] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const calculateTotalGain = async () => {
      setIsCalculating(true);
      let total = 0;

      for (const position of positions) {
        // Skip positions that are fully exited
        if (position.priceTarget21Day > 0) continue;
        
        // Only calculate unrealized gain on remaining shares
        if (position.remainingShares <= 0) continue;

        try {
          const response = await fetch(`/api/fmp/quote?symbol=${position.symbol}`);
          if (!response.ok) {
            console.error('Failed to fetch quote for position:', position.symbol, response.statusText);
            continue;
          }
          const data = await response.json();
          if (data && data[0]?.price) {
            // Calculate gain/loss on REMAINING shares only
            const gainLoss = calculateGainLoss(data[0].price, position.cost, position.remainingShares, position.type);
            total += gainLoss;
          }
        } catch (fetchError) {
          console.error('Error fetching quote for position:', position.symbol, fetchError);
        }
      }

      setTotalGain(total);
      setIsCalculating(false);
    };

    if (positions.length > 0) {
      calculateTotalGain();
    } else {
      setTotalGain(0);
      setIsCalculating(false);
    }
  }, [positions]);

  if (isCalculating) {
    return (
      <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
    );
  }

  if (totalGain === null) {
    return <span className="text-muted-foreground">N/A</span>;
  }

  return (
    <span className={cn(
      "font-medium",
      totalGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
    )}>
      {formatCurrency(totalGain)}
    </span>
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

// Sortable table header component
interface SortableHeaderProps {
  column: string;
  label: string | React.ReactNode;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

function SortableHeader({ column, label, sortColumn, sortDirection, onSort, className }: SortableHeaderProps) {
  const isActive = sortColumn === column;
  const currentSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(column)}
      aria-sort={currentSort}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : null}
      </div>
    </TableHead>
  );
}

// Component to calculate and display summary totals for equity and gain/loss
function SummaryTotalsRow({ 
  positions,
  portfolioValue,
  summaryTotals
}: { 
  positions: StockPosition[];
  portfolioValue: number;
  summaryTotals: {
    quantity: number;
    remainingShares: number;
    netCost: number;
    realizedGain: number;
  };
}) {
  const [totalEquity, setTotalEquity] = useState<number | null>(null);
  const [totalGainLoss, setTotalGainLoss] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const calculateTotals = async () => {
      setIsLoading(true);
      let equity = 0;
      let gainLoss = 0;

      // Separate closed and open positions
      const closedPositions = positions.filter(pos => {
        const isFullyClosed = pos.priceTarget21Day > 0 || 
                              pos.remainingShares <= 0 ||
                              (pos.closedDate && (pos.priceTarget2RShares > 0 || pos.priceTarget5RShares > 0));
        return isFullyClosed;
      });
      
      const openPositions = positions.filter(pos => {
        const isFullyClosed = pos.priceTarget21Day > 0 || 
                              pos.remainingShares <= 0 ||
                              (pos.closedDate && (pos.priceTarget2RShares > 0 || pos.priceTarget5RShares > 0));
        return !isFullyClosed && pos.remainingShares > 0;
      });

      // Add realized gain/loss for closed positions
      closedPositions.forEach(position => {
        const realizedGain = calculateRealizedGainForPosition(position);
        gainLoss += realizedGain;
      });

      // Fetch prices for open positions in parallel
      const pricePromises = openPositions.map(async (position) => {
        try {
          const response = await fetch(`/api/fmp/quote?symbol=${position.symbol}`);
          if (!response.ok) return { symbol: position.symbol, price: null };
          const data = await response.json();
          return { symbol: position.symbol, price: data?.[0]?.price || null };
        } catch {
          return { symbol: position.symbol, price: null };
        }
      });

      const prices = await Promise.all(pricePromises);
      const priceMap = new Map(prices.map(p => [p.symbol, p.price]));

      // Calculate totals for open positions
      openPositions.forEach((position) => {
        const currentPrice = priceMap.get(position.symbol);
        if (currentPrice !== null && currentPrice !== undefined) {
          const positionEquity = currentPrice * position.remainingShares;
          const positionGainLoss = calculateGainLoss(currentPrice, position.cost, position.remainingShares, position.type);
          
          equity += positionEquity;
          gainLoss += positionGainLoss;
        }
      });

      setTotalEquity(equity);
      setTotalGainLoss(gainLoss);
      setIsLoading(false);
    };

    if (positions.length > 0) {
      calculateTotals();
    } else {
      setTotalEquity(0);
      setTotalGainLoss(0);
      setIsLoading(false);
    }
  }, [positions]);

  const totalPortfolioPercent = portfolioValue > 0 && totalEquity !== null 
    ? (totalEquity / portfolioValue) * 100 
    : 0;

  return (
    <TableRow className="bg-muted/50 font-bold border-t-2">
      <TableCell className="border-r">Total</TableCell>
      <TableCell className="border-r">-</TableCell>
      <TableCell className="border-r">-</TableCell>
      <TableCell className="border-r">-</TableCell>
      <TableCell className="border-r">{summaryTotals.quantity}</TableCell>
      <TableCell className="border-r text-center">{summaryTotals.remainingShares}</TableCell>
      <TableCell className="border-r font-medium">{formatCurrency(summaryTotals.netCost)}</TableCell>
      <TableCell className="border-r font-medium">
        {isLoading ? (
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        ) : (
          formatCurrency(totalEquity || 0)
        )}
      </TableCell>
      <TableCell className="border-r font-medium">
        {isLoading ? (
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        ) : (
          <span className={cn(
            totalGainLoss !== null && totalGainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(totalGainLoss || 0)}
          </span>
        )}
      </TableCell>
      <TableCell className="border-r font-medium">
        <span className={cn(
          summaryTotals.realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {formatCurrency(summaryTotals.realizedGain)}
        </span>
      </TableCell>
      <TableCell className="border-r font-medium">
        {isLoading ? (
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        ) : (
          `${totalPortfolioPercent.toFixed(2)}%`
        )}
      </TableCell>
      <TableCell colSpan={13}></TableCell>
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
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>('closedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Delete confirmation state
  const [positionToDelete, setPositionToDelete] = useState<StockPosition | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Filter state
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  
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

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  // Calculate total net cost from all positions
  // Calculate exposure percentage (only for open positions)
  const calculateExposure = () => {
    const openPos = positions.filter(pos => !pos.closedDate);
    const totalNetCost = openPos.reduce((sum, position) => sum + position.netCost, 0);
    const portfolioValueNum = portfolio?.portfolio_value || 0;
    if (portfolioValueNum === 0) {
      return openPos.length === 0 ? 0 : 100; // If no portfolio value set, show 100% if there are open positions
    }
    return (totalNetCost / portfolioValueNum) * 100;
  };

  const exposure = calculateExposure();

  // R-based calculations
  const calculateRPriceTargets = (cost: number, stopLoss: number, type: 'Long' | 'Short') => {
    const initialRisk = Math.abs(cost - stopLoss);
    
    if (type === 'Long') {
      return {
        priceTarget2R: cost + (2 * initialRisk),
        priceTarget5R: cost + (5 * initialRisk),
      };
    } else {
      // For short positions, targets are below the entry price
      return {
        priceTarget2R: cost - (2 * initialRisk),
        priceTarget5R: cost - (5 * initialRisk),
      };
    }
  };

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

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const normalizedSymbolFilter = symbolFilter.trim().toUpperCase();

  const filteredPositions = useMemo(() => {
    if (!normalizedSymbolFilter) {
      return positions;
    }

    return positions.filter((pos) => pos.symbol.toUpperCase().includes(normalizedSymbolFilter));
  }, [positions, normalizedSymbolFilter]);

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
          aValue = ((a.currentPrice || a.cost) - a.cost) * a.remainingShares;
          bValue = ((b.currentPrice || b.cost) - b.cost) * b.remainingShares;
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

      const aNumber = typeof aValue === 'number' ? aValue : Number(aValue);
      const bNumber = typeof bValue === 'number' ? bValue : Number(bValue);

      return sortDirection === 'asc' ? aNumber - bNumber : bNumber - aNumber;
    });

    return basePositions;
  }, [filteredPositions, sortColumn, sortDirection, portfolio?.portfolio_value]);

  // Filter positions based on closed status (memoized to prevent unnecessary recalculations)
  const openPositions = useMemo(() => positions.filter(pos => !pos.closedDate), [positions]);
  const closedPositions = useMemo(() => positions.filter(pos => pos.closedDate), [positions]);
  
  // Apply filter to sorted positions for display
  const displayedPositions = showClosedPositions ? sortedPositions : sortedPositions.filter(pos => !pos.closedDate);

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
  const hasDisplayedPositions = displayedPositions.length > 0;
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
    <div className={`w-full p-4 sm:p-4 min-h-screen ${pageStyles.gradientBg}`}>
      <div className="grid gap-4">
      {/* Portfolio tools */}
      <div className="order-last grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="w-full">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-semibold">Add Stock Position</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-foreground mb-2">
                  Symbol
                </label>
                <Input
                  id="symbol"
                  type="text"
                  placeholder="e.g., AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label htmlFor="cost" className="block text-sm font-medium text-foreground mb-2">
                  Cost
                </label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 150.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-2">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="stop-loss" className="block text-sm font-medium text-foreground mb-2">
                  Initial Stop Loss
                </label>
                <Input
                  id="stop-loss"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 140.00"
                  value={initialStopLoss}
                  onChange={(e) => setInitialStopLoss(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-foreground mb-2">
                  Type
                </label>
                <Select value={type} onValueChange={(value: 'Long' | 'Short') => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Long">Long</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="open-date" className="block text-sm font-medium text-foreground mb-2">
                  Open Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !openDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {openDate ? format(openDate, "PPP") : <span>Pick a date</span>}
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
                className="w-full"
              >
                Add Stock
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-semibold">Position Percentage Calculator</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="adr-percent" className="block text-sm font-medium text-foreground mb-2">
                  ADR %
                </label>
                <Input
                  id="adr-percent"
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
                    
                    if (parts.length === 2 && parts[1].length > 2) {
                      return;
                    }
                    
                    setAdrPercent(formattedValue);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue > 0) {
                      setAdrPercent(numValue.toFixed(2));
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Average Daily Range percentage
                </p>
              </div>
              {adrPercent && parseFloat(adrPercent) > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Position %
                    </label>
                    <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                      {(() => {
                        const adr = parseFloat(adrPercent);
                        if (adr === 0) return '0.00%';
                        const maxPositionPercent = (1 / adr) * 100;
                        return `${maxPositionPercent.toFixed(2)}%`;
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      1 / ADR %
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Position Amount
                    </label>
                    <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                      {(() => {
                        const adr = parseFloat(adrPercent);
                        const portfolioValueNum = parseFloat(portfolioValue) || 0;
                        if (adr === 0 || portfolioValueNum === 0) return formatCurrency(0);
                        const maxPositionPercent = (1 / adr);
                        const maxPositionAmount = portfolioValueNum * maxPositionPercent;
                        return formatCurrency(maxPositionAmount);
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Portfolio Value × Max Position %
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="p-4">
            <CardTitle className="text-lg font-semibold">Portfolio Allocation</CardTitle>
            <p className="text-sm text-muted-foreground">Active positions versus remaining cash.</p>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {allocationSummary.total === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No allocation data available.
              </div>
            ) : (
              <div className="grid gap-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={allocationSlices}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        stroke="transparent"
                      >
                        {allocationSlices.map((slice, index) => (
                          <Cell key={slice.name} fill={allocationColors[index % allocationColors.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={renderAllocationTooltip} />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(label, entry) => {
                          const item = entry?.payload as { value?: number };
                          const valueAmount = typeof item?.value === 'number' ? item.value : 0;
                          const percentage = totalAllocation > 0 ? (valueAmount / totalAllocation) * 100 : 0;
                          return `${label} (${percentage.toFixed(1)}%)`;
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Open Equity</p>
                    <p className="text-lg font-semibold">{formatCurrency(openEquityValue)}</p>
                  </div>
                  <div className="rounded-lg border bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Cash</p>
                    <p className="text-lg font-semibold">{formatCurrency(cashAllocationValue)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="order-first">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle>Portfolio</CardTitle>
              <Select
                value={selectedPortfolioKey !== null ? String(selectedPortfolioKey) : undefined}
                onValueChange={handlePortfolioSelection}
                disabled={isPortfolioLoading || portfolios.length === 0}
              >
                <SelectTrigger className="w-[220px]" aria-label="Select portfolio">
                  <SelectValue placeholder="Select portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((record) => (
                    <SelectItem key={record.portfolio_key} value={String(record.portfolio_key)}>
                      <span className="flex items-center gap-2">
                        {record.portfolio_name || `Portfolio ${record.portfolio_key}`}
                        {defaultPortfolioKey === Number(record.portfolio_key) && (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
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
                      variant="outline" 
                      onClick={() => {
                        if (selectedPortfolioKey === defaultPortfolioKey) {
                          setPortfolioAsDefault(null);
                        } else if (selectedPortfolioKey !== null) {
                          setPortfolioAsDefault(selectedPortfolioKey);
                        }
                      }}
                      disabled={isPortfolioLoading || selectedPortfolioKey === null}
                      className={cn(
                        selectedPortfolioKey === defaultPortfolioKey && "border-amber-400"
                      )}
                    >
                      <Star className={cn(
                        "h-3 w-3 sm:h-4 sm:w-4",
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
                      variant="outline" 
                      onClick={handleOpenCreatePortfolio}
                      disabled={isPortfolioLoading}
                    >
                      <PlusCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create New Portfolio</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
                placeholder="Filter symbol"
                aria-label="Filter positions by symbol"
                className="w-full min-w-[160px] sm:w-40"
              />
              {!isEditingPortfolio && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" onClick={handleEditPortfolio}>
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit Portfolio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button 
                size="sm" 
                variant={showClosedPositions ? "default" : "outline"}
                onClick={() => setShowClosedPositions(!showClosedPositions)}
                disabled={closedPositions.length === 0}
              >
                {showClosedPositions ? "Hide" : "Show"} Closed ({closedPositions.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isEditingPortfolio ? (
              <>
                <div>
                  <label htmlFor="portfolio-name" className="block text-sm font-medium text-foreground mb-2">
                    Portfolio Name
                  </label>
                  <Input
                    id="portfolio-name"
                    type="text"
                    placeholder="My Portfolio"
                    value={tempPortfolioName}
                    onChange={(e) => setTempPortfolioName(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div>
                  <label htmlFor="portfolio-value-edit" className="block text-sm font-medium text-foreground mb-2">
                    Portfolio Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground pointer-events-none">
                      $
                    </span>
                    <Input
                      id="portfolio-value-edit"
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
                        }
                      }}
                      className="text-lg pl-7"
                      style={{
                        MozAppearance: 'textfield',
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
                <div className="flex gap-2 md:col-span-2 xl:col-span-3">
                  <Button onClick={handleSavePortfolio}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={handleCancelPortfolioEdit}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Portfolio Name
                  </label>
                  <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                    {portfolioName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Portfolio Value
                  </label>
                  <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                    ${(() => {
                      const val = portfolio?.portfolio_value ?? (portfolioValue ? parseFloat(portfolioValue) : 0);
                      return val.toFixed(2);
                    })()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Exposure
                  </label>
                  <div className={cn(
                    "text-lg font-medium px-3 py-2 rounded-md border",
                    exposure > 100 ? "bg-red-50 border-red-200 text-red-700" : 
                    exposure > 80 ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                    "bg-green-50 border-green-200 text-green-700"
                  )}>
                    {formatPercentage(exposure)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {positions.length === 0 ? "No positions" : 
                     exposure > 100 ? "Over-leveraged (margin)" :
                     exposure > 80 ? "High exposure" : "Normal exposure"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Unrealized Gain $
                  </label>
                  <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                    <UnrealizedGainDisplay positions={positions} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unrealized gains on remaining shares
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Realized Gain $
                  </label>
                  <div className="text-lg font-medium px-3 py-2 rounded-md border bg-muted/30">
                    <RealizedGainDisplay positions={positions} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From all realized shares
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="overflow-x-auto [&_th]:!text-xs [&_td]:!text-xs [&_th]:!px-2 [&_td]:!px-2">
            {hasPositions && hasDisplayedPositions ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <SortableHeader column="symbol" label="Symbol" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="price" label="Price" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="type" label="Type" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="cost" label="Cost" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="quantity" label="Quantity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="remainingShares" label="Remaining Shares" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="netCost" label="Net Cost" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="equity" label="Equity" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="gainLoss" label="Gain/Loss $" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="realizedGain" label="Realized Gain $" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="portfolioPercent" label="% Portfolio" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="initialStopLoss" label="Initial Stop Loss" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="stopLoss" label="Stop Loss" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader 
                      column="openRisk" 
                      label={
                        <>
                          <span>Open Risk %</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>% change from current price to stop loss</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader 
                      column="openHeat" 
                      label={
                        <>
                          <span>Open Heat %</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>% of portfolio risked if stop loss is hit</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader 
                      column="priceTarget2R" 
                      label={
                        <>
                          <span>PT 1</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>2R Price Target</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader 
                      column="priceTarget2RShares" 
                      label={
                        <>
                          <span>PT 1 #</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>Number of shares sold at PT 1</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader 
                      column="priceTarget5R" 
                      label={
                        <>
                          <span>PT 2</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>5R Price Target</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader 
                      column="priceTarget5RShares" 
                      label={
                        <>
                          <span>PT 2 #</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>Number of shares sold at PT 2</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      }
                      sortColumn={sortColumn} 
                      sortDirection={sortDirection} 
                      onSort={handleSort} 
                      className="border-r font-bold" 
                    />
                    <SortableHeader column="priceTarget21Day" label="21 Day Trail" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="openDate" label="Open Date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="closedDate" label="Closed Date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <SortableHeader column="daysInTrade" label="Days in Trade" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="border-r font-bold" />
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedPositions.map((position, index) => (
                    <TableRow key={position.id} className={cn(
                      "border-b hover:bg-muted/50",
                      index % 2 === 0 ? "bg-muted/30" : ""
                    )}>
                      {/* View mode */}
                      <>
                        <TableCell className="font-medium border-r">{position.symbol}</TableCell>
                          <TableCell className="border-r">
                            <PriceCell symbol={position.symbol} />
                          </TableCell>
                          <TableCell className="border-r">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              position.type === 'Long' 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            )}>
                              {position.type}
                            </span>
                          </TableCell>
                          <TableCell className="border-r">{formatCurrency(position.cost)}</TableCell>
                          <TableCell className="border-r">{position.quantity}</TableCell>
                          <TableCell className="border-r">
                            <div className="text-center font-medium">
                              {position.priceTarget21Day > 0 ? '0' : position.remainingShares}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium border-r">{formatCurrency(position.netCost)}</TableCell>
                          <TableCell className="border-r">
                            <EquityCell symbol={position.symbol} quantity={position.priceTarget21Day > 0 ? 0 : position.remainingShares} />
                          </TableCell>
                          <TableCell className="border-r">
                            {(() => {
                              // Check if position is fully closed (all shares realized)
                              const isFullyClosed = position.priceTarget21Day > 0 || 
                                                    position.remainingShares <= 0 ||
                                                    (position.closedDate && (position.priceTarget2RShares > 0 || position.priceTarget5RShares > 0));
                              
                              if (isFullyClosed) {
                                // Position fully exited - show total realized gain/loss
                                const totalGain = calculateRealizedGainForPosition(position);
                                
                                return (
                                  <span className={cn(
                                    "font-medium",
                                    totalGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                  )}>
                                    {formatCurrency(totalGain)}
                                  </span>
                                );
                              } else {
                                // Position still open - show unrealized gain/loss
                                return (
                                  <GainLossCell 
                                    symbol={position.symbol}
                                    cost={position.cost}
                                    quantity={position.remainingShares}
                                    type={position.type}
                                  />
                                );
                              }
                            })()}
                          </TableCell>
                          <TableCell className="border-r">
                            {(() => {
                              // Always calculate realized gain dynamically
                              const realizedGain = calculateRealizedGainForPosition(position);
                              
                              return (
                                <span className={cn(
                                  "font-medium",
                                  realizedGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                  {formatCurrency(realizedGain)}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="border-r">
                            <PortfolioPercentCell 
                              symbol={position.symbol} 
                              quantity={position.priceTarget21Day > 0 ? 0 : position.remainingShares}
                              portfolioValue={parseFloat(portfolioValue) || 0}
                            />
                          </TableCell>
                          <TableCell className="border-r">
                            <span>{formatCurrency(position.initialStopLoss)}</span>
                          </TableCell>
                          <TableCell className="border-r">
                            <span className="font-medium">{formatCurrency(position.stopLoss)}</span>
                          </TableCell>
                          <TableCell className="border-r">
                            {(() => {
                              if (position.closedDate) {
                                return (
                                  <span className="font-medium">
                                    0.00% ({formatCurrency(0)})
                                  </span>
                                );
                              }

                              const openRiskPercent = calculatePercentageChange(position.stopLoss, position.cost);
                              const openRiskAmount = calculateOpenRiskAmount(position.cost, position.stopLoss, position.quantity);

                              return (
                                <span className={cn(
                                  "font-medium",
                                  openRiskPercent < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                )}>
                                  {`${openRiskPercent >= 0 ? '+' : ''}${openRiskPercent.toFixed(2)}% (${formatCurrency(openRiskAmount)})`}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="border-r">
                            <span className={cn(
                              "font-medium",
                              position.closedDate ? "" : (
                                (() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "";
                                  const riskPerShare = Math.abs(position.cost - position.stopLoss);
                                  const totalRisk = riskPerShare * position.quantity;
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return heatPercent > 2 ? "text-red-600 dark:text-red-400" : heatPercent > 1 ? "text-orange-600 dark:text-orange-400" : "";
                                })()
                              )
                            )}>
                              {position.closedDate ? "0.00%" : (
                                (() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "N/A";
                                  const riskPerShare = Math.abs(position.cost - position.stopLoss);
                                  const totalRisk = riskPerShare * position.quantity;
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return `${heatPercent.toFixed(2)}%`;
                                })()
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="flex flex-col gap-0.5">
                              <span>{position.priceTarget2R > 0 ? formatCurrency(position.priceTarget2R) : '-'}</span>
                              {position.priceTarget2R > 0 && (
                                <PercentageChange 
                                  value={calculatePercentageChange(position.priceTarget2R, position.cost)} 
                                  size="sm"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r">
                            <span className="font-medium">{position.priceTarget2RShares || 0}</span>
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="flex flex-col gap-0.5">
                              <span>{position.priceTarget5R > 0 ? formatCurrency(position.priceTarget5R) : '-'}</span>
                              {position.priceTarget5R > 0 && (
                                <PercentageChange 
                                  value={calculatePercentageChange(position.priceTarget5R, position.cost)} 
                                  size="sm"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r">
                            <span className="font-medium">{position.priceTarget5RShares || 0}</span>
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="flex flex-col gap-0.5">
                              <span>{position.priceTarget21Day > 0 ? formatCurrency(position.priceTarget21Day) : '-'}</span>
                              {position.priceTarget21Day > 0 && (
                                <PercentageChange 
                                  value={calculatePercentageChange(position.priceTarget21Day, position.cost)} 
                                  size="sm"
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="border-r">{format(position.openDate, "MM/dd/yy")}</TableCell>
                          <TableCell className="border-r">
                            {position.closedDate ? format(position.closedDate, "MM/dd/yy") : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="border-r">
                            <span className="font-medium">
                              {`${calculateDaysInTrade(position.openDate, position.closedDate)} days`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleEditPosition(position)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDeletePosition(position)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                    </TableRow>
                  ))}
                  {hasDisplayedPositions && (
                    <SummaryTotalsRow 
                      positions={displayedPositions}
                      portfolioValue={portfolioValueNumber}
                      summaryTotals={summaryTotals}
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
        </CardContent>
      </Card>
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
