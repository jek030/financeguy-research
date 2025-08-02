export interface TradeRecord {
  symbol: string;
  name: string;
  closedDate: string;
  openedDate: string;
  quantity: number;
  proceedsPerShare: number;
  costPerShare: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  longTermGainLoss: number;
  shortTermGainLoss: number;
  term: 'Short Term' | 'Long Term';
  unadjustedCostBasis: number;
  washSale: string;
  disallowedLoss: number;
  transactionClosedDate: string;
  transactionCostBasis: number;
  totalTransactionGainLoss: number;
  totalTransactionGainLossPercent: number;
  ltTransactionGainLoss: number;
  ltTransactionGainLossPercent: number;
  stTransactionGainLoss: number;
  stTransactionGainLossPercent: number;
  daysInTrade: number;
}

export interface TradeSummary {
  totalGainLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  averageDaysInTrade: number;
  largestWinDollar: number;
  largestWinPercent: number;
  largestLossDollar: number;
  largestLossPercent: number;
}

export interface TickerPerformance {
  ticker: string;
  totalGainLoss: number;
  tradeCount: number;
}

export interface CumulativeGainData {
  date: string;
  cumulativeGain: number;
}

export interface TermDistribution {
  term: string;
  gainLoss: number;
  count: number;
}

export interface CSVUploadState {
  isLoading: boolean;
  error: string | null;
  data: TradeRecord[] | null;
}

export interface CSVFileData {
  summary: string;
  trades: TradeRecord[];
} 