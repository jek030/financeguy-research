import { useQuery } from '@tanstack/react-query';

export interface Constituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

async function fetchDowJonesConstituents(): Promise<{ symbols: Set<string>; dataMap: Map<string, Constituent> }> {
  const response = await fetch('/api/fmp/dowjones');

  if (!response.ok) {
    throw new Error('Failed to fetch Dow Jones constituents');
  }

  const data: Constituent[] = await response.json();
  const symbols = new Set(data.map(item => item.symbol));
  const dataMap = new Map(data.map(item => [item.symbol, item]));
  
  return { symbols, dataMap };
}

export function useDowJonesConstituents() {
  return useQuery({
    queryKey: ['dowjones-constituents'],
    queryFn: fetchDowJonesConstituents,
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 