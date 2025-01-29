import { useQuery } from '@tanstack/react-query';

interface Constituent {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  dateFirstAdded: string;
  cik: string;
  founded: string;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchSP500Constituents() {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/sp500_constituent?apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch S&P 500 constituents');
  }

  const data: Constituent[] = await response.json();
  return new Set(data.map(item => item.symbol));
}

export function useSP500Constituents() {
  return useQuery({
    queryKey: ['sp500-constituents'],
    queryFn: fetchSP500Constituents,
    enabled: Boolean(apiKey),
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 