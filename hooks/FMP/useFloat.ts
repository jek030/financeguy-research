import { useQuery } from '@tanstack/react-query';

interface FloatData {
  symbol: string;
  date: string;
  freeFloat: number;
  floatShares: number;
  outstandingShares: number;
  source: string;
}

async function fetchFloatData(symbol: string): Promise<FloatData[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/float?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error('Failed to fetch float data');
  }

  return response.json();
}

export function useFloat(symbol: string) {
  return useQuery<FloatData[]>({
    queryKey: ['float', symbol],
    queryFn: () => fetchFloatData(symbol),
    enabled: Boolean(symbol),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });
} 
