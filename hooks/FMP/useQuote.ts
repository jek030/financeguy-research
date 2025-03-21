import { useQuery } from '@tanstack/react-query';
import type { Ticker } from '@/lib/types';

async function fetchQuote(symbol: string): Promise<Ticker[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/quote?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch quote data');
  }

  return response.json();
}

export function useQuote(symbol: string) {
  return useQuery({
    queryKey: ['quote', symbol],
    queryFn: () => fetchQuote(symbol),
    select: (data: Ticker[]) => data[0],
    enabled: Boolean(symbol),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
    retry: 1,
    retryDelay: 3000,
  });
} 
