import { useQuery } from '@tanstack/react-query';

interface NewsItem {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

async function fetchNewsHistory(
  symbol: string, 
  startDate: string, 
  endDate: string
): Promise<NewsItem[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(
    `/api/fmp/news?symbol=${symbol}&from=${startDate}&to=${endDate}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch news data');
  }

  return response.json();
}

export function useNewsHistory(
  symbol: string, 
  startDate: string, 
  endDate: string, 
  trigger: number
) {
  return useQuery({
    queryKey: ['news-history', symbol, startDate, endDate, trigger],
    queryFn: () => fetchNewsHistory(symbol, startDate, endDate),
    enabled: Boolean(symbol && startDate && endDate),
  });
} 