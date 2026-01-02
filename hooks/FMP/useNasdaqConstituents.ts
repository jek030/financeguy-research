import { useQuery } from '@tanstack/react-query';

export interface NasdaqConstituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

async function fetchNasdaqConstituents(): Promise<NasdaqConstituent[]> {
  const response = await fetch('/api/fmp/nasdaq');

  if (!response.ok) {
    throw new Error('Failed to fetch NASDAQ constituents');
  }

  return response.json();
}

export function useNasdaqConstituents() {
  return useQuery({
    queryKey: ['nasdaq-constituent'],
    queryFn: async () => {
      const data = await fetchNasdaqConstituents();
      const symbols = new Set(data.map(item => item.symbol));
      const dataMap = new Map(data.map(item => [item.symbol, item]));
      return { symbols, dataMap };
    },
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
}

