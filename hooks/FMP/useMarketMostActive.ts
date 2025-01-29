import { useQuery } from '@tanstack/react-query';

interface MarketMostActive {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchMarketMostActive() {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch most active stocks data');
  }

  const data = await response.json();
  return data as MarketMostActive[];
}

export function useMarketMostActive() {
  return useQuery({
    queryKey: ['market-most-active'],
    queryFn: fetchMarketMostActive,
    enabled: Boolean(apiKey),
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 