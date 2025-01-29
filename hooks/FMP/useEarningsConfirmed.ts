import { useQuery } from '@tanstack/react-query';

interface EarningsConfirmed {
  symbol: string;
  exchange: string;
  time: string;
  when: string;
  date: string;
  publicationDate: string;
  title: string;
  url: string;
}

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchEarningsConfirmed(date: Date) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  // Get first and last day of the month
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const firstDay = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0);
  const lastDayFormatted = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`;

  const response = await fetch(
    `https://financialmodelingprep.com/api/v3/earning_calendar?from=${firstDay}&to=${lastDayFormatted}&limit=1000&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings data');
  }

  const data = await response.json();
  return data as EarningsConfirmed[];
}

export function useEarningsConfirmed(date: Date) {
  return useQuery({
    queryKey: ['earnings-confirmed', date.getFullYear(), date.getMonth()],
    queryFn: () => fetchEarningsConfirmed(date),
    enabled: Boolean(apiKey),
    staleTime: 24 * 60 * 60 * 1000, // Consider data fresh for 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep data in cache for 7 days
  });
} 