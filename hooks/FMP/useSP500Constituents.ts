import { useQuery } from '@tanstack/react-query';

interface SP500Constituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

async function fetchSP500Constituents(): Promise<SP500Constituent[]> {
  const response = await fetch('/api/fmp/market/sp500');

  if (!response.ok) {
    throw new Error('Failed to fetch S&P 500 constituents');
  }

  return response.json();
}

export function useSP500Constituents() {
  return useQuery({
    queryKey: ['sp500-constituents'],
    queryFn: async () => {
      const data = await fetchSP500Constituents();
      return new Set(data.map(item => item.symbol));
    },
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 