import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../../fmp/config';

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface FmpCalendarRow {
  date?: string;
  symbol?: string;
  eps?: unknown;
  epsEstimated?: unknown;
  time?: string;
  revenue?: unknown;
  revenueEstimated?: unknown;
  fiscalDateEnding?: string;
}

interface EarningsCalendarRow {
  symbol: string;
  reportDate: string;
  date: string;
  fiscalDateEnding: string;
  epsActual: number | null;
  eps: number | null;
  epsEstimated: number | null;
  revenueActual: number | null;
  revenue: number | null;
  revenueEstimated: number | null;
  reportTime: string;
  time: string;
  updatedFromDate: string;
}

function validateDateRange(from?: string, to?: string): string | null {
  if (!from || !to) return 'From and to dates are required';
  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return 'From and to dates must be YYYY-MM-DD';
  if (from > to) return 'From date must be before or equal to to date';
  return null;
}

async function fetchFmpCalendar(from: string, to: string): Promise<FmpCalendarRow[]> {
  if (!FMP_API_KEY) {
    throw new Error('FMP API key is not configured');
  }

  const url = `${FMP_BASE_URL}/v3/earning_calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&apikey=${FMP_API_KEY}`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`FMP earnings calendar request failed: ${response.statusText}`);
  }

  return response.json();
}

function createSymbolSet(symbols?: string[]): Set<string> | null {
  if (!symbols || symbols.length === 0) return null;

  return new Set(
    symbols
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean)
  );
}

function mapRows(data: FmpCalendarRow[], symbols?: string[]): EarningsCalendarRow[] {
  const symbolSet = createSymbolSet(symbols);
  const rows: EarningsCalendarRow[] = [];

  for (const row of data) {
    const symbol = row.symbol?.trim().toUpperCase();
    if (!row.date || !symbol || symbol.includes('.')) continue;
    if (symbolSet && !symbolSet.has(symbol)) continue;

    const epsActual = toNumberOrNull(row.eps);
    const revenueActual = toNumberOrNull(row.revenue);

    rows.push({
      symbol,
      reportDate: row.date,
      date: row.date,
      fiscalDateEnding: row.fiscalDateEnding || '',
      epsActual,
      eps: epsActual,
      epsEstimated: toNumberOrNull(row.epsEstimated),
      revenueActual,
      revenue: revenueActual,
      revenueEstimated: toNumberOrNull(row.revenueEstimated),
      reportTime: row.time || '',
      time: row.time || '',
      updatedFromDate: row.date,
    });
  }

  return rows.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.symbol.localeCompare(b.symbol);
  });
}

// GET handler (no symbol filtering - returns all US-exchange earnings)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const validationError = validateDateRange(from || undefined, to || undefined);

  if (validationError) {
    return NextResponse.json(
      { error: validationError },
      { status: 400 }
    );
  }

  try {
    const data = await fetchFmpCalendar(from!, to!);
    return NextResponse.json(mapRows(data));
  } catch (error) {
    console.error('Error fetching earnings calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar data' },
      { status: 500 }
    );
  }
}

// POST handler (accepts symbols array for efficient server-side filtering)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, symbols } = body as {
      from?: string;
      to?: string;
      symbols?: string[];
    };
    const validationError = validateDateRange(from, to);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const data = await fetchFmpCalendar(from!, to!);
    return NextResponse.json(mapRows(data, symbols));
  } catch (error) {
    console.error('Error fetching earnings calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar data' },
      { status: 500 }
    );
  }
}
