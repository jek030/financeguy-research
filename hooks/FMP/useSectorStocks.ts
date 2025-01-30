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
  isActivelyTrading: boolean;
}

const apiKey = process.env.FMP_API_KEY || '';

async function fetchSectorStocks(sector: string): Promise<SectorStock[]> {
  const response = await fetch(`/api/fmp/market/sector-stocks?sector=${encodeURIComponent(sector)}`);

  if (!response.ok) {
    throw new Error('Failed to fetch sector stocks');
  }

  return response.json();
}

export function useSectorStocks(sector: string) {
  return useQuery({
    queryKey: ['sector-stocks', sector],
    queryFn: () => fetchSectorStocks(sector),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    enabled: Boolean(sector),
  });
} 