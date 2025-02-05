import { useQuery } from '@tanstack/react-query';

export interface DailyPriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjClose: number;
  volume: number;
  unadjustedVolume: number;
  change: number;
  changePercent: number;
  vwap: number;
  label: string;
  changeOverTime: number;
}

interface DailyPriceResponse {
  symbol: string;
  historical: DailyPriceData[];
}

interface UseDailyPricesProps {
  symbol: string;
  from: string;
  to: string;
  enabled?: boolean;
}

async function fetchDailyPrices(
  symbol: string,
  from: string,
  to: string
): Promise<DailyPriceData[]> {
  const response = await fetch(
    `/api/fmp/dailyprices?symbol=${symbol}&from=${from}&to=${to}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch daily price data');
  }

  const data: DailyPriceResponse = await response.json();
  return data.historical;
}

export function useDailyPrices({ 
  symbol, 
  from,
  to,
  enabled = true 
}: UseDailyPricesProps) {
  return useQuery({
    queryKey: ['daily-prices', symbol, from, to],
    queryFn: () => fetchDailyPrices(symbol, from, to),
    enabled: enabled && !!symbol && !!from && !!to,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep data in cache for 15 minutes
  });
} 