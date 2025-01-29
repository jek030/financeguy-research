import { useQuery } from '@tanstack/react-query';
import { InsiderTrade } from '../../lib/types';

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchInsiderTrading(symbol: string) {
  if (!symbol || !apiKey) {
    throw new Error('Symbol and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v4/insider-trading?symbol=${symbol}&page=0&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data as InsiderTrade[];
}

export function useInsiderTrading(symbol: string) {
  return useQuery({
    queryKey: ['insider-trading', symbol],
    queryFn: () => fetchInsiderTrading(symbol),
    enabled: Boolean(symbol && apiKey),
  });
} 