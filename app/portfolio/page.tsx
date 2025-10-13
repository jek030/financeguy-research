'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { CalendarIcon } from 'lucide-react';
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
  type: 'Long' | 'Short';
  openDate: Date;
  priceTarget2R: number;
  priceTarget5R: number;
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
  const [editType, setEditType] = useState<'Long' | 'Short'>('Long');
  const [editOpenDate, setEditOpenDate] = useState<Date>(new Date());
  const [editPriceTarget2R, setEditPriceTarget2R] = useState<string>('');
  const [editPriceTarget5R, setEditPriceTarget5R] = useState<string>('');
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
      type: type,
      openDate: openDate,
      priceTarget2R: rTargets.priceTarget2R,
      priceTarget5R: rTargets.priceTarget5R,
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
    setEditType(position.type);
    setEditOpenDate(position.openDate);
    setEditPriceTarget2R(position.priceTarget2R.toString());
    setEditPriceTarget5R(position.priceTarget5R.toString());
    setEditPriceTarget21Day(position.priceTarget21Day.toString());
  };

  const handleSaveEdit = () => {
    if (!editingPosition || !editSymbol.trim() || !editCost.trim() || !editQuantity.trim()) {
      return;
    }

    const costValue = parseFloat(editCost);
    const quantityValue = parseInt(editQuantity);
    const netCost = costValue * quantityValue;
    
    // Use user-entered values for price targets
    const priceTarget2RValue = parseFloat(editPriceTarget2R) || 0;
    const priceTarget5RValue = parseFloat(editPriceTarget5R) || 0;
    const priceTarget21DayValue = parseFloat(editPriceTarget21Day) || 0;

    const updatedPosition: StockPosition = {
      ...editingPosition,
      symbol: editSymbol.trim().toUpperCase(),
      cost: costValue,
      quantity: quantityValue,
      netCost: netCost,
      type: editType,
      openDate: editOpenDate,
      priceTarget2R: priceTarget2RValue,
      priceTarget5R: priceTarget5RValue,
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
        {/* Portfolio  and Exposure */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-foreground mb-2 ">
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
              <div className="md:col-span-2 lg:col-span-3 xl:col-span-2 flex items-end">
                <Button
                  onClick={handleAddStock}
                  disabled={isAddButtonDisabled}
                  className="w-full"
                >
                  Add Stock
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      <TableHead className="border-r font-bold">2R Price Target</TableHead>
                      <TableHead className="border-r font-bold">5R Price Target</TableHead>
                      <TableHead className="border-r font-bold">21 Day Trail</TableHead>
                      <TableHead className="border-r font-bold">Open Date</TableHead>
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
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(position.initialStopLoss)}</span>
                                <PercentageChange 
                                  value={calculatePercentageChange(position.initialStopLoss, parseFloat(editCost) || position.cost)} 
                                  size="sm"
                                />
                              </div>
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
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(position.initialStopLoss)}</span>
                                <PercentageChange 
                                  value={calculatePercentageChange(position.initialStopLoss, position.cost)} 
                                  size="sm"
                                />
                              </div>
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
