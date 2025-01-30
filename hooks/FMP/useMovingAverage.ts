import { useQuery } from '@tanstack/react-query';

interface MovingAverageDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma: number;
}

async function fetchMovingAverageData(
  symbol: string,
  type: string,
  period: string,
  timeframe: string
): Promise<MovingAverageDataPoint[]> {
  if (!symbol || !type || !period || !timeframe) {
    throw new Error('All parameters are required');
  }

  const response = await fetch(
    `/api/fmp/technical/moving-average?symbol=${symbol}&type=${type}&period=${period}&timeframe=${timeframe}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch moving average data');
  }

  const result = await response.json();
  
  // Normalize the response to always use 'ma' property
  return result.map((item: any) => ({
    ...item,
    ma: item.ema || item.sma || item.ma
  }));
}

export function useMovingAverageData(
  symbol: string,
  type: string,
  period: string,
  timeframe: string
) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['moving-average', symbol, type, period, timeframe],
    queryFn: () => fetchMovingAverageData(symbol, type, period, timeframe),
    enabled: Boolean(symbol && type && period && timeframe),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
  });

  return {
    currentValue: data.length > 0 ? data[0].ma : null,
    data,
    isLoading,
    error
  };
} 