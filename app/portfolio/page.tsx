'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import { CalendarIcon, InfoIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PercentageChange } from '@/components/ui/PriceIndicator';
import { useQuote } from '@/hooks/FMP/useQuote';
import type { Ticker } from '@/lib/types';

interface StockPosition {
  id: string;
  symbol: string;
  cost: number;
  quantity: number;
  netCost: number;
  initialStopLoss: number;
  stopLoss: number;
  type: 'Long' | 'Short';
  openDate: Date;
  closedDate?: Date | null;
  priceTarget2R: number;
  priceTarget2RShares: number;
  priceTarget5R: number;
  priceTarget5RShares: number;
  priceTarget21Day: number;
  currentPrice?: number;
}

// Helper function to format currency
const formatCurrency = (value: number) => {
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

// Helper function to calculate gain/loss
const calculateGainLoss = (currentPrice: number, cost: number, quantity: number, type: 'Long' | 'Short') => {
  if (type === 'Long') {
    return (currentPrice - cost) * quantity;
  } else {
    return (cost - currentPrice) * quantity;
  }
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
    <div className="flex items-center gap-2">
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
    <div className="flex items-center gap-2">
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

export default function Portfolio() {
  const [portfolioValue, setPortfolioValue] = useState<string>('');
  const [symbol, setSymbol] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [initialStopLoss, setInitialStopLoss] = useState<string>('');
  const [type, setType] = useState<'Long' | 'Short'>('Long');
  const [openDate, setOpenDate] = useState<Date>(new Date());
  const [positions, setPositions] = useState<StockPosition[]>([]);
  
  // Edit state
  const [editingPosition, setEditingPosition] = useState<StockPosition | null>(null);
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

  const handleAddStock = () => {
    if (!symbol.trim() || !cost.trim() || !quantity.trim() || !initialStopLoss.trim()) {
      return;
    }

    const costValue = parseFloat(cost);
    const quantityValue = parseInt(quantity);
    const stopLossValue = parseFloat(initialStopLoss);
    const netCost = costValue * quantityValue;

    // Calculate R-based price targets
    const rTargets = calculateRPriceTargets(costValue, stopLossValue, type);

    const newPosition: StockPosition = {
      id: Date.now().toString(),
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
    };

    setPositions([...positions, newPosition]);
    setSymbol('');
    setCost('');
    setQuantity('');
    setInitialStopLoss('');
    setType('Long');
    setOpenDate(new Date());
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
  const totalNetCost = positions.reduce((sum, position) => sum + position.netCost, 0);
  
  // Calculate exposure percentage
  const calculateExposure = () => {
    const portfolioValueNum = parseFloat(portfolioValue) || 0;
    if (portfolioValueNum === 0) {
      return positions.length === 0 ? 0 : 100; // If no portfolio value set, show 100% if there are positions
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
    setEditingPosition(position);
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
  };

  const handleSaveEdit = () => {
    if (!editingPosition || !editSymbol.trim() || !editCost.trim() || !editQuantity.trim()) {
      return;
    }

    const costValue = parseFloat(editCost);
    const quantityValue = parseInt(editQuantity);
    const netCost = costValue * quantityValue;
    const stopLossValue = parseFloat(editStopLoss) || editingPosition.stopLoss;
    
    // Use user-entered values for price targets
    const priceTarget2RValue = parseFloat(editPriceTarget2R) || 0;
    const priceTarget2RSharesValue = parseInt(editPriceTarget2RShares) || 0;
    const priceTarget5RValue = parseFloat(editPriceTarget5R) || 0;
    const priceTarget5RSharesValue = parseInt(editPriceTarget5RShares) || 0;
    const priceTarget21DayValue = parseFloat(editPriceTarget21Day) || 0;

    const updatedPosition: StockPosition = {
      ...editingPosition,
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

    setPositions(positions.map(p => p.id === editingPosition.id ? updatedPosition : p));
    setEditingPosition(null);
  };

  const handleCancelEdit = () => {
    setEditingPosition(null);
  };

  // Helper function to recalculate R targets in edit mode
  const recalculateEditRTargets = () => {
    if (!editingPosition) return;
    
    const costValue = parseFloat(editCost) || editingPosition.cost;
    const rTargets = calculateRPriceTargets(costValue, editingPosition.initialStopLoss, editType);
    
    setEditPriceTarget2R(rTargets.priceTarget2R.toString());
    setEditPriceTarget5R(rTargets.priceTarget5R.toString());
  };

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
      </div>

      <div className="grid gap-6">
        {/* Portfolio Overview and Add Stock Position side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="portfolio-value" className="block text-sm font-medium text-foreground mb-2">
                    Portfolio 
                  </label>
                  <Input
                    id="portfolio-value"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                    className="text-lg"
                  />
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
              </div>
            </CardContent>
          </Card>

          {/* Add Stock Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Stock Position</CardTitle>
            </CardHeader>
            <CardContent>
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
        </div>

        {/* Portfolio Table */}
        {positions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="border-r font-bold">Symbol</TableHead>
                      <TableHead className="border-r font-bold">Price</TableHead>
                      <TableHead className="border-r font-bold">Type</TableHead>
                      <TableHead className="border-r font-bold">Cost</TableHead>
                      <TableHead className="border-r font-bold">Quantity</TableHead>
                      <TableHead className="border-r font-bold">Net Cost</TableHead>
                      <TableHead className="border-r font-bold">Equity</TableHead>
                      <TableHead className="border-r font-bold">Gain/Loss $</TableHead>
                      <TableHead className="border-r font-bold">% Portfolio</TableHead>
                      <TableHead className="border-r font-bold">Initial Stop Loss</TableHead>
                      <TableHead className="border-r font-bold">Stop Loss</TableHead>
                      <TableHead className="border-r font-bold">
                        <div className="flex items-center gap-1">
                          <span>Open Risk %</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>% change from current price to stop loss</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="border-r font-bold">
                        <div className="flex items-center gap-1">
                          <span>Open Heat %</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>% of portfolio risked if stop loss is hit</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="border-r font-bold">
                        <div className="flex items-center gap-1">
                          <span>PT 1</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>2R Price Target</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="border-r font-bold">
                        <div className="flex items-center gap-1">
                          <span>PT 1 #</span>
                           <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                               </TooltipTrigger>
                               <TooltipContent side="top" sideOffset={5}>
                                  <p>Number of shares sold at PT 1</p>
                               </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                      </TableHead>
                      <TableHead className="border-r font-bold">
                        <div className="flex items-center gap-1">
                          <span>PT 2</span>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                <p>5R Price Target</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="border-r font-bold"><div className="flex items-center gap-1">
                          <span>PT 2 #</span>
                           <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                <button className="inline-flex">
                                  <InfoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                               </TooltipTrigger>
                               <TooltipContent side="top" sideOffset={5}>
                                  <p>Number of shares sold at PT 2</p>
                               </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div></TableHead>
                      <TableHead className="border-r font-bold">21 Day Trail</TableHead>
                      <TableHead className="border-r font-bold">Open Date</TableHead>
                      <TableHead className="border-r font-bold">Closed Date</TableHead>
                      <TableHead className="border-r font-bold">Days in Trade</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id} className="border-b hover:bg-muted/50">
                        {editingPosition?.id === position.id ? (
                          // Edit mode
                          <>
                            <TableCell className="border-r">
                              <Input
                                value={editSymbol}
                                onChange={(e) => setEditSymbol(e.target.value.toUpperCase())}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <PriceCell symbol={editSymbol} />
                            </TableCell>
                            <TableCell className="border-r">
                              <Select value={editType} onValueChange={(value: 'Long' | 'Short') => {
                                setEditType(value);
                                // Recalculate R targets when type changes
                                setTimeout(() => {
                                  const costValue = parseFloat(editCost) || editingPosition.cost;
                                  const rTargets = calculateRPriceTargets(costValue, editingPosition.initialStopLoss, value);
                                  setEditPriceTarget2R(rTargets.priceTarget2R.toString());
                                  setEditPriceTarget5R(rTargets.priceTarget5R.toString());
                                }, 0);
                              }}>
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Long">Long</SelectItem>
                                  <SelectItem value="Short">Short</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="border-r">
                              <Input
                                type="number"
                                step="0.01"
                                value={editCost}
                                onChange={(e) => {
                                  setEditCost(e.target.value);
                                  // Recalculate R targets when cost changes
                                  setTimeout(() => {
                                    const costValue = parseFloat(e.target.value) || editingPosition.cost;
                                    const rTargets = calculateRPriceTargets(costValue, editingPosition.initialStopLoss, editType);
                                    setEditPriceTarget2R(rTargets.priceTarget2R.toString());
                                    setEditPriceTarget5R(rTargets.priceTarget5R.toString());
                                  }, 0);
                                }}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <Input
                                type="number"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell className="font-medium border-r">
                              {formatCurrency(parseFloat(editCost) * parseInt(editQuantity))}
                            </TableCell>
                            <TableCell className="border-r">
                              <EquityCell symbol={editSymbol} quantity={parseInt(editQuantity) || 0} />
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">N/A</span>
                              </div>
                            </TableCell>
                            <TableCell className="border-r">
                              <PortfolioPercentCell 
                                symbol={editSymbol} 
                                quantity={parseInt(editQuantity) || 0}
                                portfolioValue={parseFloat(portfolioValue) || 0}
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground border-r">
                              <span>{formatCurrency(position.initialStopLoss)}</span>
                            </TableCell>
                            <TableCell className="border-r">
                              <Input
                                type="number"
                                step="0.01"
                                value={editStopLoss}
                                onChange={(e) => setEditStopLoss(e.target.value)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <span className={cn(
                                "font-medium",
                                calculatePercentageChange(parseFloat(editStopLoss) || position.stopLoss, parseFloat(editCost) || position.cost) < 0
                                  ? "text-red-600 dark:text-red-400" 
                                  : "text-green-600 dark:text-green-400"
                              )}>
                                {calculatePercentageChange(parseFloat(editStopLoss) || position.stopLoss, parseFloat(editCost) || position.cost) >= 0 ? '+' : ''}{calculatePercentageChange(parseFloat(editStopLoss) || position.stopLoss, parseFloat(editCost) || position.cost).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="border-r">
                              <span className={cn(
                                "font-medium",
                                (() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "";
                                  const costValue = parseFloat(editCost) || position.cost;
                                  const stopLossValue = parseFloat(editStopLoss) || position.stopLoss;
                                  const riskPerShare = Math.abs(costValue - stopLossValue);
                                  const totalRisk = riskPerShare * (parseInt(editQuantity) || position.quantity);
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return heatPercent > 2 ? "text-red-600 dark:text-red-400" : heatPercent > 1 ? "text-orange-600 dark:text-orange-400" : "";
                                })()
                              )}>
                                {(() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "N/A";
                                  const costValue = parseFloat(editCost) || position.cost;
                                  const stopLossValue = parseFloat(editStopLoss) || position.stopLoss;
                                  const riskPerShare = Math.abs(costValue - stopLossValue);
                                  const totalRisk = riskPerShare * (parseInt(editQuantity) || position.quantity);
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return `${heatPercent.toFixed(2)}%`;
                                })()}
                              </span>
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editPriceTarget2R}
                                  onChange={(e) => setEditPriceTarget2R(e.target.value)}
                                  className="w-20"
                                />
                                {parseFloat(editPriceTarget2R) > 0 && (
                                  <PercentageChange 
                                    value={calculatePercentageChange(parseFloat(editPriceTarget2R), parseFloat(editCost) || position.cost)} 
                                    size="sm"
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r">
                              <Input
                                type="number"
                                value={editPriceTarget2RShares}
                                onChange={(e) => setEditPriceTarget2RShares(e.target.value)}
                                className="w-20"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editPriceTarget5R}
                                  onChange={(e) => setEditPriceTarget5R(e.target.value)}
                                  className="w-20"
                                />
                                {parseFloat(editPriceTarget5R) > 0 && (
                                  <PercentageChange 
                                    value={calculatePercentageChange(parseFloat(editPriceTarget5R), parseFloat(editCost) || position.cost)} 
                                    size="sm"
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r">
                              <Input
                                type="number"
                                value={editPriceTarget5RShares}
                                onChange={(e) => setEditPriceTarget5RShares(e.target.value)}
                                className="w-20"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editPriceTarget21Day}
                                  onChange={(e) => setEditPriceTarget21Day(e.target.value)}
                                  className="w-20"
                                />
                                {parseFloat(editPriceTarget21Day) > 0 && (
                                  <PercentageChange 
                                    value={calculatePercentageChange(parseFloat(editPriceTarget21Day), parseFloat(editCost) || position.cost)} 
                                    size="sm"
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-32">
                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                    {format(editOpenDate, "MM/dd")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editOpenDate}
                                    onSelect={(date) => date && setEditOpenDate(date)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="border-r">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-32">
                                    <CalendarIcon className="mr-1 h-3 w-3" />
                                    {editClosedDate ? format(editClosedDate, "MM/dd") : "Not Closed"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <div className="p-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full mb-2"
                                      onClick={() => setEditClosedDate(undefined)}
                                    >
                                      Clear Date
                                    </Button>
                                  </div>
                                  <Calendar
                                    mode="single"
                                    selected={editClosedDate}
                                    onSelect={(date) => setEditClosedDate(date)}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="border-r">
                              <span className="font-medium">
                                {(() => {
                                  const endDate = editClosedDate || new Date();
                                  const diffTime = Math.abs(endDate.getTime() - editOpenDate.getTime());
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return `${diffDays} days`;
                                })()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" onClick={handleSaveEdit}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          // View mode
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
                            <TableCell className="font-medium border-r">{formatCurrency(position.netCost)}</TableCell>
                            <TableCell className="border-r">
                              <EquityCell symbol={position.symbol} quantity={position.quantity} />
                            </TableCell>
                            <TableCell className="border-r">
                              <GainLossCell 
                                symbol={position.symbol}
                                cost={position.cost}
                                quantity={position.quantity}
                                type={position.type}
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <PortfolioPercentCell 
                                symbol={position.symbol} 
                                quantity={position.quantity}
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
                              <span className={cn(
                                "font-medium",
                                calculatePercentageChange(position.stopLoss, position.cost) < 0
                                  ? "text-red-600 dark:text-red-400" 
                                  : "text-green-600 dark:text-green-400"
                              )}>
                                {calculatePercentageChange(position.stopLoss, position.cost) >= 0 ? '+' : ''}{calculatePercentageChange(position.stopLoss, position.cost).toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="border-r">
                              <span className={cn(
                                "font-medium",
                                (() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "";
                                  const riskPerShare = Math.abs(position.cost - position.stopLoss);
                                  const totalRisk = riskPerShare * position.quantity;
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return heatPercent > 2 ? "text-red-600 dark:text-red-400" : heatPercent > 1 ? "text-orange-600 dark:text-orange-400" : "";
                                })()
                              )}>
                                {(() => {
                                  const portfolioValueNum = parseFloat(portfolioValue) || 0;
                                  if (portfolioValueNum === 0) return "N/A";
                                  const riskPerShare = Math.abs(position.cost - position.stopLoss);
                                  const totalRisk = riskPerShare * position.quantity;
                                  const heatPercent = (totalRisk / portfolioValueNum) * 100;
                                  return `${heatPercent.toFixed(2)}%`;
                                })()}
                              </span>
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center gap-2">
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
                              <div className="flex items-center gap-2">
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
                              <div className="flex items-center gap-2">
                                <span>{position.priceTarget21Day > 0 ? formatCurrency(position.priceTarget21Day) : '-'}</span>
                                {position.priceTarget21Day > 0 && (
                                  <PercentageChange 
                                    value={calculatePercentageChange(position.priceTarget21Day, position.cost)} 
                                    size="sm"
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="border-r">{format(position.openDate, "MMM dd, yyyy")}</TableCell>
                            <TableCell className="border-r">
                              {position.closedDate ? format(position.closedDate, "MMM dd, yyyy") : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="border-r">
                              <span className="font-medium">
                                {(() => {
                                  const endDate = position.closedDate || new Date();
                                  const diffTime = Math.abs(endDate.getTime() - position.openDate.getTime());
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  return `${diffDays} days`;
                                })()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => handleEditPosition(position)}>
                                Edit
                              </Button>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
