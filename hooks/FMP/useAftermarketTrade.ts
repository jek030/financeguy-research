import { useQuery } from '@tanstack/react-query';
import type { AftermarketTrade } from '@/lib/types';

async function fetchAftermarketTrade(symbol: string): Promise<AftermarketTrade[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/aftermarket-trade?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch aftermarket trade data');
  }

  return response.json();
}

export function useAftermarketTrade(symbol: string) {
  return useQuery({
    queryKey: ['aftermarket-trade', symbol],
    queryFn: () => fetchAftermarketTrade(symbol),
    select: (data: AftermarketTrade[]) => data[0], // Get the most recent trade
    enabled: Boolean(symbol),
    refetchInterval: 30000, // Refetch every 30 seconds for after hours data
    staleTime: 15000, // Consider data stale after 15 seconds
    gcTime: 2 * 60 * 1000, // Keep unused data in cache for 2 minutes
    retry: 1,
    retryDelay: 2000,
  });
}
