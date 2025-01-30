import { useQuery } from '@tanstack/react-query';
import { StockDividend } from '@/lib/types';

interface DividendHistoryResponse {
  symbol: string;
  historical: StockDividend[];
}

async function fetchDividendHistory(symbol: string): Promise<StockDividend[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/dividendhistory?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dividend history');
  }

  const jsonData: DividendHistoryResponse = await response.json();
  return jsonData.historical || [];
}

export function useDividendHistory(symbol: string) {
  return useQuery({
    queryKey: ['dividend-history', symbol],
    queryFn: () => fetchDividendHistory(symbol),
    enabled: Boolean(symbol),
  });
} 