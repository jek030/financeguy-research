import { TradeRecord } from '@/lib/types/trading';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, parse } from 'date-fns';

// Helper function to parse dates from CSV (handles MM/DD/YYYY and YYYY-MM-DD formats)
export function parseTradeDate(dateString: string): Date {
  try {
    // First try ISO format (YYYY-MM-DD)
    const isoDate = parseISO(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  } catch {
    // ISO parsing failed, try MM/DD/YYYY format
  }

  try {
    // Try MM/DD/YYYY format (like "7/25/2025")
    const parsedDate = parse(dateString, 'M/d/yyyy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch {
    // MM/DD/YYYY parsing failed
  }

  try {
    // Try MM/DD/YY format (like "7/25/25")
    const parsedDate = parse(dateString, 'M/d/yy', new Date());
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch {
    // All parsing failed
  }

  throw new Error(`Unable to parse date: ${dateString}`);
}

export interface PeriodStats {
  period: string;
  periodKey: string; // Used for filtering
  startDate: Date;
  endDate: Date;
  netGainLoss: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageGain: number;
  averageLoss: number;
  trades: TradeRecord[]; // Store trades for this period
}

export interface PeriodAggregation {
  type: 'monthly' | 'weekly';
  periods: PeriodStats[];
}

function calculatePeriodStats(trades: TradeRecord[], period: string, startDate: Date, endDate: Date): PeriodStats {
  const netGainLoss = trades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const winningTrades = trades.filter(trade => trade.gainLoss > 0);
  const losingTrades = trades.filter(trade => trade.gainLoss < 0);
  
  const totalWins = winningTrades.reduce((sum, trade) => sum + trade.gainLoss, 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.gainLoss, 0));

  return {
    period,
    periodKey: format(startDate, 'yyyy-MM-dd'), // Consistent key for filtering
    startDate,
    endDate,
    netGainLoss,
    tradeCount: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
    averageGain: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    trades,
  };
}

export function aggregateTradesByMonth(trades: TradeRecord[]): PeriodAggregation {
  const monthlyGroups = new Map<string, TradeRecord[]>();

  // Group trades by month
  trades.forEach(trade => {
    try {
      const closeDate = parseTradeDate(trade.closedDate);
      const monthStart = startOfMonth(closeDate);
      const monthKey = format(monthStart, 'yyyy-MM');
      
      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(trade);
    } catch (error) {
      console.warn('Invalid date in trade:', trade.closedDate, error);
    }
  });

  // Convert to PeriodStats array
  const periods: PeriodStats[] = Array.from(monthlyGroups.entries())
    .map(([monthKey, monthTrades]) => {
      const monthStart = startOfMonth(parseISO(monthKey + '-01'));
      const monthEnd = endOfMonth(monthStart);
      const periodLabel = format(monthStart, 'MMM yyyy');
      
      return calculatePeriodStats(monthTrades, periodLabel, monthStart, monthEnd);
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return {
    type: 'monthly',
    periods,
  };
}

export function aggregateTradesByWeek(trades: TradeRecord[]): PeriodAggregation {
  const weeklyGroups = new Map<string, TradeRecord[]>();

  // Group trades by ISO week (Monday start)
  trades.forEach(trade => {
    try {
      const closeDate = parseTradeDate(trade.closedDate);
      const weekStart = startOfWeek(closeDate, { weekStartsOn: 1 }); // Monday start
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyGroups.has(weekKey)) {
        weeklyGroups.set(weekKey, []);
      }
      weeklyGroups.get(weekKey)!.push(trade);
    } catch (error) {
      console.warn('Invalid date in trade:', trade.closedDate, error);
    }
  });

  // Convert to PeriodStats array
  const periods: PeriodStats[] = Array.from(weeklyGroups.entries())
    .map(([weekKey, weekTrades]) => {
      const weekStart = parseISO(weekKey);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const periodLabel = `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      
      return calculatePeriodStats(weekTrades, periodLabel, weekStart, weekEnd);
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return {
    type: 'weekly',
    periods,
  };
}

export function getPeriodTrades(trades: TradeRecord[], periodKey: string, type: 'monthly' | 'weekly'): TradeRecord[] {
  const targetDate = parseISO(periodKey);
  
  return trades.filter(trade => {
    try {
      const closeDate = parseTradeDate(trade.closedDate);

      if (type === 'monthly') {
        const tradeMonth = format(startOfMonth(closeDate), 'yyyy-MM-dd');
        const targetMonth = format(startOfMonth(targetDate), 'yyyy-MM-dd');
        return tradeMonth === targetMonth;
      } else {
        const tradeWeekStart = startOfWeek(closeDate, { weekStartsOn: 1 });
        const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        return format(tradeWeekStart, 'yyyy-MM-dd') === format(targetWeekStart, 'yyyy-MM-dd');
      }
    } catch (error) {
      return false;
    }
  });
} 