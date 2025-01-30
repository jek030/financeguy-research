import { useQueries } from '@tanstack/react-query';

async function fetchKeyMetrics(symbol: string, period: 'annual' | 'quarter' | 'ttm') {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/keymetrics?symbol=${symbol}&period=${period}`);

  if (!response.ok) {
    throw new Error('Failed to fetch key metrics data');
  }

  return response.json();
}

export function useKeyMetrics(symbol: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['key-metrics', symbol, 'annual'],
        queryFn: () => fetchKeyMetrics(symbol, 'annual'),
        enabled: Boolean(symbol),
      },
      {
        queryKey: ['key-metrics', symbol, 'quarter'],
        queryFn: () => fetchKeyMetrics(symbol, 'quarter'),
        enabled: Boolean(symbol),
      },
      {
        queryKey: ['key-metrics', symbol, 'ttm'],
        queryFn: () => fetchKeyMetrics(symbol, 'ttm'),
        enabled: Boolean(symbol),
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