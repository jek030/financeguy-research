import { useQuery } from '@tanstack/react-query';

interface SectorPerformance {
  sector: string;
  changesPercentage: string;
}

async function fetchSectorPerformance(): Promise<SectorPerformance[]> {
  const response = await fetch('/api/fmp/market/sectors');

  if (!response.ok) {
    throw new Error('Failed to fetch sector data');
  }

  return response.json();
}

export function useSectorPerformance() {
  return useQuery({
    queryKey: ['sector-performance'],
    queryFn: fetchSectorPerformance,
    staleTime: 3 * 60 * 1000, // Consider data fresh for 3 minutes
    gcTime: 5 * 60 * 1000, // Keep data in cache for 5 minutes
  });
} 