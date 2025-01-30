import { useQuery } from '@tanstack/react-query';

interface FloatData {
  symbol: string;
  date: string;
  freeFloat: number;
  floatShares: number;
  outstandingShares: number;
  source: string;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchFloatData(symbol: string): Promise<FloatData[]> {
  if (!symbol || !apiKey) {
    throw new Error('Symbol and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v4/shares_float?symbol=${symbol}&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch float data');
  }

  return response.json();
}

export function useFloat(symbol: string) {
  return useQuery<FloatData[]>({
    queryKey: ['float', symbol],
    queryFn: () => fetchFloatData(symbol),
    enabled: Boolean(symbol && apiKey),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });
} 
