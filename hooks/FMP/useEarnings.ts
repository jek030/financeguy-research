import { useQueries } from '@tanstack/react-query';

interface IncomeStatement {
  date: string;
  symbol: string;
  fillingDate: string;
  revenue: number;
  eps: number;
  netIncome: number;
}

async function fetchIncomeStatement(symbol: string, period: 'annual' | 'quarter'): Promise<IncomeStatement[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/earnings?symbol=${symbol}&period=${period}`);

  if (!response.ok) {
    throw new Error('Failed to fetch income statement data');
  }

  return response.json();
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