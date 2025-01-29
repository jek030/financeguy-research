import { useQuery } from '@tanstack/react-query';

interface SectorStock {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  lastAnnualDividend: number;
  volume: number;
  exchange: string;
  exchangeShortName: string;
  country: string;
  isEtf: boolean;
  isFund: boolean;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchSectorStocks(sector: string) {
  if (!sector || !apiKey) {
    throw new Error('Sector and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/stock-screener?sector=${encodeURIComponent(sector)}&isActivelyTrading=true&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sector stocks data');
  }

  const data = await response.json();
  return (data as SectorStock[]).filter(
    item => item.exchangeShortName === 'NASDAQ' || 
           item.exchangeShortName === 'NYSE' || 
           item.exchangeShortName === 'AMEX'
  );
}

export function useSectorStocks(sector: string) {
  return useQuery({
    queryKey: ['sector-stocks', sector],
    queryFn: () => fetchSectorStocks(sector),
    enabled: Boolean(sector && apiKey),
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 