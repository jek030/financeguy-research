import { useQuery } from '@tanstack/react-query';

async function fetchRSIData(symbol: string) {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) throw new Error('API key is not configured');
  if (!symbol) return [];

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/technical_indicator/1day/${symbol}?type=rsi&period=14&apikey=${apiKey}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch RSI data');
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