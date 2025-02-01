import { useQuery } from '@tanstack/react-query';

interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number | null;
  pe: number | null;
  earningsAnnouncement: string | null;
  sharesOutstanding: number;
  timestamp: number;
}

async function fetchCryptoQuote(symbol: string): Promise<CryptoQuote[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/cryptoquote?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}

export function useCryptoQuote(symbol: string) {
  return useQuery({
    queryKey: ['crypto-quote', symbol],
    queryFn: () => fetchCryptoQuote(symbol),
    enabled: Boolean(symbol),
  });
} 