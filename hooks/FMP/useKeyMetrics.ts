import { useQueries } from '@tanstack/react-query';

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchKeyMetrics(symbol: string, period: 'annual' | 'quarter' | 'ttm') {
  if (!symbol || !apiKey) {
    throw new Error('Symbol and API key are required');
  }

  const url = period === 'ttm'
    ? `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${apiKey}`
    : `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?period=${period}&apikey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch key metrics data');
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid key metrics data format');
  }

  return data;
}

export function useKeyMetrics(symbol: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['key-metrics', symbol, 'annual'],
        queryFn: () => fetchKeyMetrics(symbol, 'annual'),
        enabled: Boolean(symbol && apiKey),
      },
      {
        queryKey: ['key-metrics', symbol, 'quarter'],
        queryFn: () => fetchKeyMetrics(symbol, 'quarter'),
        enabled: Boolean(symbol && apiKey),
      },
      {
        queryKey: ['key-metrics', symbol, 'ttm'],
        queryFn: () => fetchKeyMetrics(symbol, 'ttm'),
        enabled: Boolean(symbol && apiKey),
      },
    ],
  });

  return {
    annualData: results[0].data ?? null,
    quarterlyData: results[1].data ?? null,
    ttmData: results[2].data ?? null,
    isLoading: results.some(result => result.isLoading),
    error: results.find(result => result.error)?.error ?? null,
  };
} 