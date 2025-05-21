import { useQueries } from '@tanstack/react-query';

interface IncomeStatement {
  date: string;
  symbol: string;
  fillingDate: string;
  revenue: number;
  epsdiluted: number;
  netIncome: number;
  period: string;
  weightedAverageShsOutDil: number;
}

async function fetchIncomeStatement(symbol: string, period: 'annual' | 'quarter'): Promise<IncomeStatement[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/earnings?symbol=${symbol}&period=${period}`);

  if (!response.ok) {
    throw new Error('Failed to fetch income statement data');
  }

  const data = await response.json();
  console.log(data);
  // Calculate EPS diluted ourselves and format all data
  return data.map((item: any) => {
    // Calculate EPS diluted with precision (netIncome / weightedAverageShsOutDil)
    const calculatedEpsDiluted = item.weightedAverageShsOutDil ? 
      Number((item.netIncome / item.weightedAverageShsOutDil).toFixed(6)) : 
      item.epsdiluted || item.eps || 0;
    
    return {
      date: item.date,
      symbol: item.symbol,
      fillingDate: item.fillingDate,
      revenue: item.revenue,
      epsdiluted: calculatedEpsDiluted,
      netIncome: item.netIncome,
      period: item.period,
      weightedAverageShsOutDil: item.weightedAverageShsOutDil || 0
    };
  });
}

export function useEarnings(symbol: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['income-statement', symbol, 'annual'],
        queryFn: () => fetchIncomeStatement(symbol, 'annual'),
        enabled: Boolean(symbol),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
      },
      {
        queryKey: ['income-statement', symbol, 'quarter'],
        queryFn: () => fetchIncomeStatement(symbol, 'quarter'),
        enabled: Boolean(symbol),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
      },
    ],
  });
  return {
    annualData: results[0].data,
    quarterlyData: results[1].data,
    isLoading: results.some(result => result.isLoading),
    error: results.find(result => result.error)?.error,
  };
} 