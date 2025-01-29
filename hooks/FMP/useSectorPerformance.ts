import { useQuery } from '@tanstack/react-query';

interface SectorPerformance {
  sector: string;
  changesPercentage: string;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchSectorPerformance() {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/sectors-performance?apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sector data');
  }

  const data = await response.json();
  return data as SectorPerformance[];
}

export function useSectorPerformance() {
  return useQuery({
    queryKey: ['sector-performance'],
    queryFn: fetchSectorPerformance,
    enabled: Boolean(apiKey),
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 