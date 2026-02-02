// Raw JSON structure from brokerage export
export interface RawBrokerageTransaction {
  Date: string;
  Action: string;
  Symbol: string;
  Description: string;
  Quantity: string;
  Price: string;
  "Fees & Comm": string;
  Amount: string;
  AcctgRuleCd: string;
}

export interface RawTransactionFile {
  FromDate: string;
  ToDate: string;
  TotalTransactionsAmount: string;
  TotalFeesAndCommAmount: string;
  BrokerageTransactions: RawBrokerageTransaction[];
}

// Parsed/normalized transaction data
export interface BrokerageTransaction {
  id: string;
  date: string;
  action: string;
  symbol: string;
  description: string;
  quantity: number | null;
  price: number | null;
  feesAndComm: number | null;
  amount: number;
  acctgRuleCd: string;
}

export interface TransactionFile {
  fromDate: string;
  toDate: string;
  totalTransactionsAmount: number;
  totalFeesAndCommAmount: number;
  transactions: BrokerageTransaction[];
}

// Symbol-level aggregation
export interface SymbolSummary {
  symbol: string;
  description: string;
  totalBuyQuantity: number;
  totalSellQuantity: number;
  buyAmount: number;
  sellAmount: number;
  netAmount: number;
  totalFees: number;
  transactionCount: number;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
}

// Action-type aggregation (for non-stock transactions)
export interface ActionSummary {
  action: string;
  totalAmount: number;
  transactionCount: number;
  totalFees: number;
}

// Overall transaction summary
export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  totalFees: number;
  netCashFlow: number;
  uniqueSymbols: number;
  dateRange: {
    from: string;
    to: string;
  };
  actionBreakdown: Record<string, number>;
}

// Daily volume data for charts
export interface DailyVolume {
  date: string;
  buyVolume: number;
  sellVolume: number;
  netVolume: number;
  transactionCount: number;
}

// Open position (unmatched buy/sell)
export interface OpenPosition {
  symbol: string;
  description: string;
  side: 'long' | 'short';
  quantity: number;
  avgCostBasis: number;
  totalCost: number;
  firstTradeDate: string;
  lastTradeDate: string;
  tradeCount: number;
}

// Action types for categorization
export const TRADE_ACTIONS = ['Buy', 'Sell', 'Sell Short', 'Buy to Cover'] as const;
export const OPTION_ACTIONS = ['Buy to Open', 'Sell to Open', 'Buy to Close', 'Sell to Close'] as const;
export const INCOME_ACTIONS = ['Qualified Dividend', 'Non-Qualified Dividend', 'Bank Interest', 'Credit Interest'] as const;
export const EXPENSE_ACTIONS = ['Margin Interest', 'Foreign Tax Paid', 'ADR Mgmt Fee'] as const;

export type TradeAction = typeof TRADE_ACTIONS[number];
export type OptionAction = typeof OPTION_ACTIONS[number];
export type IncomeAction = typeof INCOME_ACTIONS[number];
export type ExpenseAction = typeof EXPENSE_ACTIONS[number];

export function isTradeAction(action: string): boolean {
  return TRADE_ACTIONS.includes(action as TradeAction);
}

export function isOptionAction(action: string): boolean {
  return OPTION_ACTIONS.includes(action as OptionAction);
}

export function isIncomeAction(action: string): boolean {
  return INCOME_ACTIONS.includes(action as IncomeAction);
}

export function isExpenseAction(action: string): boolean {
  return EXPENSE_ACTIONS.includes(action as ExpenseAction);
}

export function getActionCategory(action: string): 'trade' | 'option' | 'income' | 'expense' | 'other' {
  if (isTradeAction(action)) return 'trade';
  if (isOptionAction(action)) return 'option';
  if (isIncomeAction(action)) return 'income';
  if (isExpenseAction(action)) return 'expense';
  return 'other';
}
