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

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchMovingAverageData(
  symbol: string, 
  type: string, 
  period: string, 
  timeframe: string
) {
  if (!symbol || !type || !period || !timeframe || !apiKey) {
    throw new Error('All parameters and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/technical_indicator/${timeframe}/${symbol}?type=${type}&period=${period}&apikey=${apiKey}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch moving average data');
  }
  
  const result = await response.json();
  
  const normalizedResult = result?.map((item: any) => ({
    ...item,
    ma: item.ema || item.sma || item.ma
  }));
  
  return normalizedResult || [];
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
    enabled: Boolean(symbol && type && period && timeframe && apiKey),
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