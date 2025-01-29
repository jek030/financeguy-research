import { useQuery } from '@tanstack/react-query';
import type { Ticker } from '@/lib/types';

async function fetchQuote(symbol: string): Promise<Ticker[]> {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) throw new Error('FMP API key is not configured');

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`
  );

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
  });
} 
