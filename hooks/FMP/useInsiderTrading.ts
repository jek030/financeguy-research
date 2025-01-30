import { useQuery } from '@tanstack/react-query';
import { InsiderTrade } from '@/lib/types';

async function fetchInsiderTrading(symbol: string): Promise<InsiderTrade[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/insider?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export function useInsiderTrading(symbol: string) {
  return useQuery({
    queryKey: ['insider-trading', symbol],
    queryFn: () => fetchInsiderTrading(symbol),
    enabled: Boolean(symbol),
  });
} 