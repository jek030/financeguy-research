import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

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
  updatedFromDate: string;
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
    `/api/earnings/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch earnings data');
  }

  return response.json();
}

export function useEarningsConfirmed(from: string, to: string, symbols?: string[]) {
  const normalizedSymbols = useMemo(() => {
    if (!symbols) return undefined;
    return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))).sort();
  }, [symbols]);

  const symbolsKey = normalizedSymbols ? normalizedSymbols.join(',') : 'all';

  return useQuery({
    queryKey: ['earnings-confirmed', from, to, symbolsKey],
    queryFn: () => fetchEarningsConfirmed(from, to, normalizedSymbols),
    // Only fetch when symbols are available (if symbols param is used)
    enabled: (normalizedSymbols === undefined || normalizedSymbols.length > 0) && from !== '' && to !== '',
    staleTime: 15 * 60 * 1000, // Earnings actuals can update during the trading day
    gcTime: 24 * 60 * 60 * 1000,
  });
}
