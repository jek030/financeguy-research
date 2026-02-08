import { useQuery } from '@tanstack/react-query';

export interface Nasdaq100Holding {
  asset: string;
  name: string;
  weightPercentage: number;
  sharesNumber: number;
  marketValue: number;
  updated: string;
  // Map to common constituent shape for compatibility
  symbol: string;
  sector: string;
  subSector: string;
}

interface ETFHolding {
  asset: string;
  name: string;
  weightPercentage: number;
  sharesNumber: number;
  marketValue: number;
  updated: string;
}

async function fetchNasdaq100Constituents(): Promise<ETFHolding[]> {
  const response = await fetch('/api/fmp/nasdaq100');

  if (!response.ok) {
    throw new Error('Failed to fetch NASDAQ 100 constituents');
  }

  return response.json();
}

export function useNasdaq100Constituents() {
  return useQuery({
    queryKey: ['nasdaq100-constituents'],
    queryFn: async () => {
      const data = await fetchNasdaq100Constituents();
      // The ETF holdings use "asset" as the ticker symbol
      const symbols = new Set(data.map(item => item.asset));
      const dataMap = new Map(
        data.map(item => [
          item.asset,
          {
            symbol: item.asset,
            name: item.name,
            sector: '',
            subSector: '',
          },
        ])
      );
      return { symbols, dataMap };
    },
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
}
