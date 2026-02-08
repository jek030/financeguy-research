import { useQuery } from '@tanstack/react-query';

interface EarningsConfirmed {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  updatedFromDate: string;
  fiscalDateEnding: string;
  exchange?: string;
  when?: string;
  publicationDate?: string;
  title?: string;
  url?: string;
}

async function fetchEarningsConfirmed(date: Date, symbols?: string[]): Promise<EarningsConfirmed[]> {
  // Get first and last day of the month
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0);
  const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;

  // If symbols are provided, use POST with server-side filtering (much more efficient)
  if (symbols && symbols.length > 0) {
    const response = await fetch('/api/earnings/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: firstDay,
        to: lastDayFormatted,
        symbols,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch earnings data');
    }

    return response.json();
  }

  // Fallback: GET without symbol filtering
  const response = await fetch(
    `/api/earnings/calendar?from=${firstDay}&to=${lastDayFormatted}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings data');
  }

  return response.json();
}

export function useEarningsConfirmed(date: Date, symbols?: string[]) {
  return useQuery({
    queryKey: ['earnings-confirmed', date.getFullYear(), date.getMonth(), symbols?.length ?? 0],
    queryFn: () => fetchEarningsConfirmed(date, symbols),
    // Only fetch when symbols are available (if symbols param is used)
    enabled: symbols === undefined || symbols.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 