import { useQuery } from '@tanstack/react-query';

interface EarningsConfirmed {
  id?: number;
  reportDate?: string;
  date: string;
  symbol: string;
  epsActual?: number | null;
  eps: number | null;
  epsEstimated: number | null;
  reportTime?: string;
  time: string;
  revenueActual?: number | null;
  revenue: number | null;
  revenueEstimated: number | null;
  updatedAt?: string;
  updatedFromDate: string;
  createdAt?: string;
  fiscalDateEnding: string;
  exchange?: string;
  when?: string;
  publicationDate?: string;
  title?: string;
  url?: string;
}

async function fetchEarningsConfirmed(from: string, to: string, symbols?: string[]): Promise<EarningsConfirmed[]> {
  // If symbols are provided, use POST with server-side filtering (much more efficient)
  if (symbols && symbols.length > 0) {
    const response = await fetch('/api/earnings/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, symbols }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch earnings data');
    }

    return response.json();
  }

  // Fallback: GET without symbol filtering
  const response = await fetch(
    `/api/earnings/calendar?from=${from}&to=${to}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings data');
  }

  return response.json();
}

export function useEarningsConfirmed(from: string, to: string, symbols?: string[]) {
  return useQuery({
    queryKey: ['earnings-confirmed', from, to, symbols?.length ?? 0],
    queryFn: () => fetchEarningsConfirmed(from, to, symbols),
    // Only fetch when symbols are available (if symbols param is used)
    enabled: (symbols === undefined || symbols.length > 0) && from !== '' && to !== '',
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
}
