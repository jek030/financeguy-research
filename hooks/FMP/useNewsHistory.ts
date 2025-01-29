import { useQuery } from '@tanstack/react-query';

async function fetchNewsHistory(symbol: string, startDate: string, endDate: string) {
  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
  if (!apiKey) throw new Error('FMP API key is not configured');

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&page=1&from=${startDate}&to=${endDate}&apikey=${apiKey}`
  );

  if (!response.ok) throw new Error('Failed to fetch news data');
  
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Invalid news data format');
  
  return data;
}

export function useNewsHistory(symbol: string, startDate: string, endDate: string, trigger: number) {
  return useQuery({
    queryKey: ['news-history', symbol, startDate, endDate, trigger],
    queryFn: () => fetchNewsHistory(symbol, startDate, endDate),
    enabled: Boolean(symbol && startDate && endDate),
  });
} 