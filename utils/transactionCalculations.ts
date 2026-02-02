import {
  RawTransactionFile,
  RawBrokerageTransaction,
  BrokerageTransaction,
  TransactionFile,
  SymbolSummary,
  ActionSummary,
  TransactionSummary,
  DailyVolume,
  OpenPosition,
  getActionCategory,
} from '@/lib/types/transactions';

/**
 * Parse a currency string like "$1,234.56" or "-$1,234.56" to a number
 */
export function parseTransactionAmount(value: string): number {
  if (!value || value.trim() === '') return 0;
  
  // Remove $ and commas, handle negative values
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a quantity string like "1,200" to a number
 */
export function parseQuantity(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a price string like "$24.285" to a number
 */
export function parsePrice(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse the raw JSON file into normalized transaction data
 */
export function parseTransactionFile(raw: RawTransactionFile): TransactionFile {
  const transactions: BrokerageTransaction[] = raw.BrokerageTransactions.map((t, index) => ({
    id: `txn-${index}-${t.Date}-${t.Symbol || 'none'}`,
    date: t.Date,
    action: t.Action,
    symbol: t.Symbol,
    description: t.Description,
    quantity: parseQuantity(t.Quantity),
    price: parsePrice(t.Price),
    feesAndComm: parsePrice(t["Fees & Comm"]),
    amount: parseTransactionAmount(t.Amount),
    acctgRuleCd: t.AcctgRuleCd,
  }));

  return {
    fromDate: raw.FromDate,
    toDate: raw.ToDate,
    totalTransactionsAmount: parseTransactionAmount(raw.TotalTransactionsAmount),
    totalFeesAndCommAmount: parseTransactionAmount(raw.TotalFeesAndCommAmount),
    transactions,
  };
}

/**
 * Calculate summary statistics for all transactions
 */
export function calculateTransactionSummary(transactions: BrokerageTransaction[]): TransactionSummary {
  const actionBreakdown: Record<string, number> = {};
  let totalVolume = 0;
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  let totalFees = 0;
  let netCashFlow = 0;
  const symbols = new Set<string>();

  transactions.forEach((t) => {
    // Track action counts
    actionBreakdown[t.action] = (actionBreakdown[t.action] || 0) + 1;

    // Calculate volumes
    const absAmount = Math.abs(t.amount);
    totalVolume += absAmount;
    
    if (t.action.toLowerCase().includes('buy')) {
      totalBuyVolume += absAmount;
    } else if (t.action.toLowerCase().includes('sell')) {
      totalSellVolume += absAmount;
    }

    // Track fees
    if (t.feesAndComm) {
      totalFees += t.feesAndComm;
    }

    // Net cash flow
    netCashFlow += t.amount;

    // Track unique symbols
    if (t.symbol) {
      symbols.add(t.symbol);
    }
  });

  // Get date range from transactions
  const dates = transactions
    .map((t) => t.date.split(' ')[0]) // Handle "as of" dates
    .sort();
  
  return {
    totalTransactions: transactions.length,
    totalVolume,
    totalBuyVolume,
    totalSellVolume,
    totalFees,
    netCashFlow,
    uniqueSymbols: symbols.size,
    dateRange: {
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
    },
    actionBreakdown,
  };
}

/**
 * Aggregate transactions by symbol
 */
export function calculateSymbolSummaries(transactions: BrokerageTransaction[]): SymbolSummary[] {
  const symbolMap = new Map<string, {
    description: string;
    buyQuantity: number;
    sellQuantity: number;
    buyAmount: number;
    sellAmount: number;
    totalFees: number;
    count: number;
    buyPrices: number[];
    sellPrices: number[];
  }>();

  transactions.forEach((t) => {
    // Use symbol or action as key for non-symbol transactions
    const key = t.symbol || `[${t.action}]`;
    const existing = symbolMap.get(key) || {
      description: t.description,
      buyQuantity: 0,
      sellQuantity: 0,
      buyAmount: 0,
      sellAmount: 0,
      totalFees: 0,
      count: 0,
      buyPrices: [],
      sellPrices: [],
    };

    existing.count++;
    existing.totalFees += t.feesAndComm || 0;

    const isBuy = t.action.toLowerCase().includes('buy');
    const isSell = t.action.toLowerCase().includes('sell');

    if (isBuy) {
      existing.buyQuantity += t.quantity || 0;
      existing.buyAmount += Math.abs(t.amount);
      if (t.price) existing.buyPrices.push(t.price);
    } else if (isSell) {
      existing.sellQuantity += t.quantity || 0;
      existing.sellAmount += Math.abs(t.amount);
      if (t.price) existing.sellPrices.push(t.price);
    } else {
      // For non-trade actions (dividends, interest, fees)
      if (t.amount > 0) {
        existing.sellAmount += t.amount; // Income
      } else {
        existing.buyAmount += Math.abs(t.amount); // Expense
      }
    }

    symbolMap.set(key, existing);
  });

  const summaries: SymbolSummary[] = [];
  symbolMap.forEach((data, symbol) => {
    const avgBuyPrice = data.buyPrices.length > 0
      ? data.buyPrices.reduce((a, b) => a + b, 0) / data.buyPrices.length
      : null;
    const avgSellPrice = data.sellPrices.length > 0
      ? data.sellPrices.reduce((a, b) => a + b, 0) / data.sellPrices.length
      : null;

    summaries.push({
      symbol,
      description: data.description,
      totalBuyQuantity: data.buyQuantity,
      totalSellQuantity: data.sellQuantity,
      buyAmount: data.buyAmount,
      sellAmount: data.sellAmount,
      netAmount: data.sellAmount - data.buyAmount,
      totalFees: data.totalFees,
      transactionCount: data.count,
      avgBuyPrice,
      avgSellPrice,
    });
  });

  // Sort by transaction count descending
  return summaries.sort((a, b) => b.transactionCount - a.transactionCount);
}

/**
 * Aggregate transactions by action type (useful for non-stock transactions)
 */
export function calculateActionSummaries(transactions: BrokerageTransaction[]): ActionSummary[] {
  const actionMap = new Map<string, {
    totalAmount: number;
    count: number;
    totalFees: number;
  }>();

  transactions.forEach((t) => {
    const existing = actionMap.get(t.action) || {
      totalAmount: 0,
      count: 0,
      totalFees: 0,
    };

    existing.totalAmount += t.amount;
    existing.count++;
    existing.totalFees += t.feesAndComm || 0;

    actionMap.set(t.action, existing);
  });

  const summaries: ActionSummary[] = [];
  actionMap.forEach((data, action) => {
    summaries.push({
      action,
      totalAmount: data.totalAmount,
      transactionCount: data.count,
      totalFees: data.totalFees,
    });
  });

  // Sort by count descending
  return summaries.sort((a, b) => b.transactionCount - a.transactionCount);
}

/**
 * Calculate daily volume for charting
 */
export function calculateDailyVolume(transactions: BrokerageTransaction[]): DailyVolume[] {
  const dailyMap = new Map<string, {
    buyVolume: number;
    sellVolume: number;
    count: number;
  }>();

  transactions.forEach((t) => {
    // Extract date without "as of" suffix
    const date = t.date.split(' ')[0];
    
    const existing = dailyMap.get(date) || {
      buyVolume: 0,
      sellVolume: 0,
      count: 0,
    };

    existing.count++;

    if (t.action.toLowerCase().includes('buy')) {
      existing.buyVolume += Math.abs(t.amount);
    } else if (t.action.toLowerCase().includes('sell')) {
      existing.sellVolume += Math.abs(t.amount);
    }

    dailyMap.set(date, existing);
  });

  const volumes: DailyVolume[] = [];
  dailyMap.forEach((data, date) => {
    volumes.push({
      date,
      buyVolume: data.buyVolume,
      sellVolume: data.sellVolume,
      netVolume: data.sellVolume - data.buyVolume,
      transactionCount: data.count,
    });
  });

  // Sort by date
  return volumes.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * Get unique symbols from transactions
 */
export function getUniqueSymbols(transactions: BrokerageTransaction[]): string[] {
  const symbols = new Set<string>();
  transactions.forEach((t) => {
    if (t.symbol) {
      symbols.add(t.symbol);
    }
  });
  return Array.from(symbols).sort();
}

/**
 * Get unique action types from transactions
 */
export function getUniqueActions(transactions: BrokerageTransaction[]): string[] {
  const actions = new Set<string>();
  transactions.forEach((t) => {
    actions.add(t.action);
  });
  return Array.from(actions).sort();
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

/**
 * Format large numbers with abbreviations
 */
export function formatCompactCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

/**
 * Get category color for action type
 */
export function getActionCategoryColor(action: string): string {
  const category = getActionCategory(action);
  switch (category) {
    case 'trade':
      return 'text-blue-500';
    case 'option':
      return 'text-purple-500';
    case 'income':
      return 'text-emerald-500';
    case 'expense':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

/**
 * Calculate open positions (trades without matching buy/sell)
 * Processes transactions chronologically and tracks net position.
 * A "Buy" can cover a "Sell Short", and a "Sell" closes a "Buy" position.
 * Options are tracked separately from stock.
 */
export function calculateOpenPositions(transactions: BrokerageTransaction[]): OpenPosition[] {
  // Separate stock and option transactions, then sort by date (earliest first)
  const stockTransactions: BrokerageTransaction[] = [];
  const optionTransactions: BrokerageTransaction[] = [];

  transactions.forEach((t) => {
    if (!t.symbol) return;
    
    const actionLower = t.action.toLowerCase();
    
    // Options have "to open" or "to close" in action
    if (actionLower.includes('to open') || actionLower.includes('to close')) {
      optionTransactions.push(t);
    } else if (actionLower === 'buy' || actionLower === 'sell' || 
               actionLower === 'sell short' || actionLower === 'buy to cover') {
      stockTransactions.push(t);
    }
  });

  // Sort by date (earliest first)
  const sortByDate = (a: BrokerageTransaction, b: BrokerageTransaction) => {
    const dateA = new Date(a.date.split(' ')[0]);
    const dateB = new Date(b.date.split(' ')[0]);
    return dateA.getTime() - dateB.getTime();
  };

  stockTransactions.sort(sortByDate);
  optionTransactions.sort(sortByDate);

  const openPositions: OpenPosition[] = [];

  // Process STOCK positions
  // Track net position: positive = long, negative = short
  const stockPositions = new Map<string, {
    description: string;
    netPosition: number; // positive = long, negative = short
    costBasis: number; // total cost basis for current position
    dates: string[];
    tradeCount: number;
  }>();

  stockTransactions.forEach((t) => {
    const qty = t.quantity || 0;
    const amount = Math.abs(t.amount);
    const price = t.price || (qty > 0 ? amount / qty : 0);
    const actionLower = t.action.toLowerCase();
    const dateStr = t.date.split(' ')[0];

    const existing = stockPositions.get(t.symbol) || {
      description: t.description,
      netPosition: 0,
      costBasis: 0,
      dates: [],
      tradeCount: 0,
    };

    existing.dates.push(dateStr);
    existing.tradeCount++;

    const prevPosition = existing.netPosition;

    if (actionLower === 'buy' || actionLower === 'buy to cover') {
      // Buying increases position (or covers short)
      if (prevPosition < 0) {
        // Covering short position
        const coverQty = Math.min(qty, Math.abs(prevPosition));
        const remainingQty = qty - coverQty;
        
        // Reduce short position
        existing.netPosition += coverQty;
        // Reduce cost basis proportionally
        if (Math.abs(prevPosition) > 0) {
          existing.costBasis = existing.costBasis * (Math.abs(prevPosition) - coverQty) / Math.abs(prevPosition);
        }
        
        // Any remaining qty opens a long position
        if (remainingQty > 0) {
          existing.netPosition += remainingQty;
          existing.costBasis += remainingQty * price;
        }
      } else {
        // Adding to long position
        existing.netPosition += qty;
        existing.costBasis += qty * price;
      }
    } else if (actionLower === 'sell') {
      // Selling decreases position (closes long)
      if (prevPosition > 0) {
        const sellQty = Math.min(qty, prevPosition);
        const remainingQty = qty - sellQty;
        
        // Reduce long position
        existing.netPosition -= sellQty;
        // Reduce cost basis proportionally
        if (prevPosition > 0) {
          existing.costBasis = existing.costBasis * (prevPosition - sellQty) / prevPosition;
        }
        
        // Any remaining qty opens a short position (though unusual)
        if (remainingQty > 0) {
          existing.netPosition -= remainingQty;
          existing.costBasis += remainingQty * price;
        }
      } else {
        // Selling when flat or short - adds to short
        existing.netPosition -= qty;
        existing.costBasis += qty * price;
      }
    } else if (actionLower === 'sell short') {
      // Sell short opens/adds to short position
      existing.netPosition -= qty;
      existing.costBasis += qty * price;
    }

    stockPositions.set(t.symbol, existing);
  });

  // Convert stock positions to open positions
  stockPositions.forEach((data, symbol) => {
    if (Math.abs(data.netPosition) > 0.001) { // Has open position
      const sortedDates = data.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const avgCost = Math.abs(data.netPosition) > 0 ? data.costBasis / Math.abs(data.netPosition) : 0;
      
      openPositions.push({
        symbol,
        description: data.description,
        side: data.netPosition > 0 ? 'long' : 'short',
        quantity: Math.abs(data.netPosition),
        avgCostBasis: avgCost,
        totalCost: data.costBasis,
        firstTradeDate: sortedDates[0] || '',
        lastTradeDate: sortedDates[sortedDates.length - 1] || '',
        tradeCount: data.tradeCount,
      });
    }
  });

  // Process OPTION positions
  // Group by symbol (which includes strike/expiry for options)
  const optionPositions = new Map<string, {
    description: string;
    netPosition: number; // positive = long, negative = short (written)
    costBasis: number;
    dates: string[];
    tradeCount: number;
  }>();

  optionTransactions.forEach((t) => {
    const qty = t.quantity || 0;
    const amount = Math.abs(t.amount);
    const price = t.price || (qty > 0 ? amount / qty : 0);
    const actionLower = t.action.toLowerCase();
    const dateStr = t.date.split(' ')[0];

    const existing = optionPositions.get(t.symbol) || {
      description: t.description,
      netPosition: 0,
      costBasis: 0,
      dates: [],
      tradeCount: 0,
    };

    existing.dates.push(dateStr);
    existing.tradeCount++;

    if (actionLower === 'buy to open') {
      existing.netPosition += qty;
      existing.costBasis += qty * price;
    } else if (actionLower === 'sell to close') {
      // Closing long option
      const closeQty = Math.min(qty, existing.netPosition);
      if (existing.netPosition > 0) {
        existing.costBasis = existing.costBasis * (existing.netPosition - closeQty) / existing.netPosition;
      }
      existing.netPosition -= closeQty;
    } else if (actionLower === 'sell to open') {
      // Writing an option (short)
      existing.netPosition -= qty;
      existing.costBasis += qty * price; // Premium received
    } else if (actionLower === 'buy to close') {
      // Closing short option
      const closeQty = Math.min(qty, Math.abs(existing.netPosition));
      if (existing.netPosition < 0) {
        existing.costBasis = existing.costBasis * (Math.abs(existing.netPosition) - closeQty) / Math.abs(existing.netPosition);
      }
      existing.netPosition += closeQty;
    }

    optionPositions.set(t.symbol, existing);
  });

  // Convert option positions to open positions
  optionPositions.forEach((data, symbol) => {
    if (Math.abs(data.netPosition) > 0.001) { // Has open position
      const sortedDates = data.dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const avgCost = Math.abs(data.netPosition) > 0 ? data.costBasis / Math.abs(data.netPosition) : 0;
      
      openPositions.push({
        symbol,
        description: data.description,
        side: data.netPosition > 0 ? 'long' : 'short',
        quantity: Math.abs(data.netPosition),
        avgCostBasis: avgCost,
        totalCost: data.costBasis,
        firstTradeDate: sortedDates[0] || '',
        lastTradeDate: sortedDates[sortedDates.length - 1] || '',
        tradeCount: data.tradeCount,
      });
    }
  });

  // Sort by total cost descending
  return openPositions.sort((a, b) => b.totalCost - a.totalCost);
}
