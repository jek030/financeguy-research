import { useQuery } from '@tanstack/react-query';
import { StockDividend } from '../../lib/types';

interface DividendHistoryResponse {
  symbol: string;
  historical: StockDividend[];
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchDividendHistory(symbol: string) {
  if (!symbol || !apiKey) {
    throw new Error('Symbol and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${symbol}?apikey=${apiKey}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch dividend history');
  }

  const jsonData: DividendHistoryResponse = await response.json();
  return jsonData.historical || [];
}

export function useDividendHistory(symbol: string) {
  return useQuery({
    queryKey: ['dividend-history', symbol],
    queryFn: () => fetchDividendHistory(symbol),
    enabled: Boolean(symbol && apiKey),
  });
} 