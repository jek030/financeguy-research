import { useQuery } from '@tanstack/react-query';

interface MarketGainer {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

async function fetchMarketGainers(): Promise<MarketGainer[]> {
  const response = await fetch('/api/fmp/market/gainers');

  if (!response.ok) {
    throw new Error('Failed to fetch market gainers data');
  }

  return response.json();
}

export function useMarketGainers() {
  return useQuery({
    queryKey: ['market-gainers'],
    queryFn: fetchMarketGainers,
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
}
