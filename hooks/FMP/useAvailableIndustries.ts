import { useQuery } from '@tanstack/react-query';

interface SectorIndustriesResponse {
  sector: string;
  industries: string[];
  source: 'company-screener' | 'available-industries';
}

async function fetchAvailableIndustries(): Promise<string[]> {
  const response = await fetch('/api/fmp/market/available-industries');

  if (!response.ok) {
    throw new Error('Failed to fetch available industries');
  }

  return response.json();
}

async function fetchSectorIndustries(sector: string): Promise<string[]> {
  const response = await fetch(
    `/api/fmp/market/sector-industries?sector=${encodeURIComponent(sector)}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch industries for selected sector');
  }

  const payload: SectorIndustriesResponse = await response.json();
  return payload.industries ?? [];
}

export function useAvailableIndustries(selectedSector?: string) {
  return useQuery({
    queryKey: ['available-industries', selectedSector || 'all'],
    queryFn: () =>
      selectedSector && selectedSector.trim() !== ''
        ? fetchSectorIndustries(selectedSector)
        : fetchAvailableIndustries(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
