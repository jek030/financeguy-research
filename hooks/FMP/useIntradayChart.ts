import { useQuery } from '@tanstack/react-query';

export interface IntradayChartData {
  date: string;
  open: number;
  low: number;
  high: number;
  close: number;
  volume: number;
}

type TimeframeType = '1min' | '5min' | '15min' | '30min' | '1hour' | '4hour';

interface UseIntradayChartProps {
  symbol: string;
  timeframe: TimeframeType;
  from?: string; // YYYY-MM-DD format
  to?: string;   // YYYY-MM-DD format
  enabled?: boolean;
}

async function fetchIntradayChart(
  symbol: string,
  timeframe: TimeframeType,
  from?: string,
  to?: string
): Promise<IntradayChartData[]> {
  const params = new URLSearchParams({
    symbol,
    timeframe
  });
  
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  const response = await fetch(
    `/api/fmp/intradaychart?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch intraday chart data');
  }

  return response.json();
}

export function useIntradayChart({ 
  symbol, 
  timeframe,
  from,
  to, 
  enabled = true 
}: UseIntradayChartProps) {
  return useQuery({
    queryKey: ['intraday-chart', symbol, timeframe, from, to],
    queryFn: () => fetchIntradayChart(symbol, timeframe, from, to),
    enabled: enabled && !!symbol && !!timeframe,
    staleTime: 1 * 60 * 1000, // Consider data fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 