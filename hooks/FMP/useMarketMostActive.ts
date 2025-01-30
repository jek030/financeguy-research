import { useQuery } from '@tanstack/react-query';

interface MarketMostActive {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

async function fetchMarketMostActive(): Promise<MarketMostActive[]> {
  const response = await fetch('/api/fmp/market/most-active');

  if (!response.ok) {
    throw new Error('Failed to fetch most active stocks data');
  }

  return response.json();
}

export function useMarketMostActive() {
  return useQuery({
    queryKey: ['market-most-active'],
    queryFn: fetchMarketMostActive,
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 