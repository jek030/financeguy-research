import { useQuery } from '@tanstack/react-query';
import { StockDividend } from '@/lib/types';

async function fetchDividendYield(symbol: string): Promise<number | null> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/dividendhistory?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch dividend data');
  }

  const jsonData: StockDividend[] = await response.json();
  
  // Return the most recent dividend yield, or null if no dividends
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    return jsonData[0].yield;
  }
  
  return null;
}

export function useDividendYield(symbol: string) {
  return useQuery({
    queryKey: ['dividend-yield', symbol],
    queryFn: () => fetchDividendYield(symbol),
    enabled: Boolean(symbol),
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  });
}

