import { useQuery } from '@tanstack/react-query';

async function fetchAvailableCountries(): Promise<string[]> {
  const response = await fetch('/api/fmp/market/available-countries');

  if (!response.ok) {
    throw new Error('Failed to fetch available countries');
  }

  return response.json();
}

export function useAvailableCountries() {
  return useQuery({
    queryKey: ['available-countries'],
    queryFn: fetchAvailableCountries,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
