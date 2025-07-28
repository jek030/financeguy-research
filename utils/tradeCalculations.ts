import { TradeRecord, TradeSummary, TickerPerformance, CumulativeGainData, TermDistribution } from '@/lib/types/trading';
import { parseTradeDate } from './aggregateByPeriod';

export function calculateTradeSummary(trades: TradeRecord[]): TradeSummary {
  if (trades.length === 0) {
    return {
      totalGainLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      averageDaysInTrade: 0,
    };
  }

  const totalGainLoss = trades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const winningTrades = trades.filter(trade => trade.gainLoss > 0);
  const losingTrades = trades.filter(trade => trade.gainLoss < 0);

  const totalWins = winningTrades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.gainLoss, 0));
  const totalDaysInTrade = trades.reduce((sum, trade) => sum + (trade.daysInTrade || 0), 0);

  return {
    totalGainLoss,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    averageDaysInTrade: trades.length > 0 ? totalDaysInTrade / trades.length : 0,
  };
}

export function calculateTickerPerformance(trades: TradeRecord[]): TickerPerformance[] {
  const tickerMap = new Map<string, { totalGainLoss: number; count: number }>();

  trades.forEach(trade => {
    const existing = tickerMap.get(trade.symbol) || { totalGainLoss: 0, count: 0 };
    tickerMap.set(trade.symbol, {
      totalGainLoss: existing.totalGainLoss + trade.gainLoss,
      count: existing.count + 1,
    });
  });

  return Array.from(tickerMap.entries())
    .map(([ticker, data]) => ({
      ticker,
      totalGainLoss: data.totalGainLoss,
      tradeCount: data.count,
    }))
    .sort((a, b) => b.totalGainLoss - a.totalGainLoss);
}

export function calculateCumulativeGains(trades: TradeRecord[]): CumulativeGainData[] {
  // Sort trades by close date
  const sortedTrades = [...trades].sort((a, b) => {
    try {
      const dateA = parseTradeDate(a.closedDate);
      const dateB = parseTradeDate(b.closedDate);
      return dateA.getTime() - dateB.getTime();
    } catch (error) {
      // If date parsing fails, maintain original order
      return 0;
    }
  });

  let cumulativeGain = 0;
  const cumulativeData: CumulativeGainData[] = [];

  sortedTrades.forEach(trade => {
    cumulativeGain += trade.gainLoss;
    cumulativeData.push({
      date: trade.closedDate,
      cumulativeGain,
    });
  });

  return cumulativeData;
}

export function calculateTermDistribution(trades: TradeRecord[]): TermDistribution[] {
  const termMap = new Map<string, { gainLoss: number; count: number }>();

  trades.forEach(trade => {
    const existing = termMap.get(trade.term) || { gainLoss: 0, count: 0 };
    termMap.set(trade.term, {
      gainLoss: existing.gainLoss + trade.gainLoss,
      count: existing.count + 1,
    });
  });

  return Array.from(termMap.entries()).map(([term, data]) => ({
    term: term.charAt(0).toUpperCase() + term.slice(1),
    gainLoss: data.gainLoss,
    count: data.count,
  }));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
} 