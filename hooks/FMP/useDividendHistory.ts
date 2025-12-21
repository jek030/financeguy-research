import { useQuery } from '@tanstack/react-query';
import { StockDividend } from '@/lib/types';

async function fetchDividendHistory(symbol: string): Promise<StockDividend[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/dividendhistory?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dividend history');
  }

  const jsonData: StockDividend[] = await response.json();
  return Array.isArray(jsonData) ? jsonData : [];
}

export function useDividendHistory(symbol: string) {
  return useQuery({
    queryKey: ['dividend-history', symbol],
    queryFn: () => fetchDividendHistory(symbol),
    enabled: Boolean(symbol),
  });
} 