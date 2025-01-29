import { useQuery } from '@tanstack/react-query';

interface MarketGainer {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchMarketGainers() {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch market gainers data');
  }

  const data = await response.json();
  return data as MarketGainer[];
}

export function useMarketGainers() {
  return useQuery({
    queryKey: ['market-gainers'],
    queryFn: fetchMarketGainers,
    enabled: Boolean(apiKey),
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
}
