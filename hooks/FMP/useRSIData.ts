import { useQuery } from '@tanstack/react-query';

interface RSIDataPoint {
  date: string;
  rsi: number;
}

async function fetchRSIData(symbol: string): Promise<RSIDataPoint[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/technical/rsi?symbol=${symbol}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch RSI data');
  }

  return response.json();
}

export function useRSIData(symbol: string) {
  return useQuery({
    queryKey: ['rsi-data', symbol],
    queryFn: () => fetchRSIData(symbol),
    select: (data) => ({
      rsi: data.length > 0 ? data[0].rsi : null,
      rsiData: [...data].reverse(),
    }),
    enabled: Boolean(symbol),
  });
} 