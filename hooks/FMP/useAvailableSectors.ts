import { useQuery } from '@tanstack/react-query';

async function fetchAvailableSectors(): Promise<string[]> {
  const response = await fetch('/api/fmp/market/available-sectors');

  if (!response.ok) {
    throw new Error('Failed to fetch available sectors');
  }

  return response.json();
}

export function useAvailableSectors() {
  return useQuery({
    queryKey: ['available-sectors'],
    queryFn: fetchAvailableSectors,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
