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

async function fetchEarningsConfirmed(date: Date): Promise<EarningsConfirmed[]> {
  // Get first and last day of the month
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0);
  const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;

  const response = await fetch(
    `/api/fmp/calendar?from=${firstDay}&to=${lastDayFormatted}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings data');
  }

  return response.json();
}

export function useEarningsConfirmed(date: Date) {
  return useQuery({
    queryKey: ['earnings-confirmed', date.getFullYear(), date.getMonth()],
    queryFn: () => fetchEarningsConfirmed(date),
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 