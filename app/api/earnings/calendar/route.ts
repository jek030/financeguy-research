import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// Helper to map database rows to the shape the frontend expects
function mapRows(data: Record<string, unknown>[]) {
  return data.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    reportDate: (row.report_date as string) || '',
    date: (row.report_date as string) || '',
    fiscalDateEnding: (row.fiscal_date_ending as string) || '',
    epsActual: toNumberOrNull(row.eps_actual),
    eps: toNumberOrNull(row.eps_actual),
    epsEstimated: toNumberOrNull(row.eps_estimated),
    revenueActual: toNumberOrNull(row.revenue_actual),
    revenue: toNumberOrNull(row.revenue_actual),
    revenueEstimated: toNumberOrNull(row.revenue_estimated),
    reportTime: (row.report_time as string) || '',
    time: (row.report_time as string) || '',
    updatedAt: (row.updated_at as string) || '',
    updatedFromDate: row.updated_at ? (row.updated_at as string).split('T')[0] : '',
    createdAt: (row.created_at as string) || '',
  }));
}

// GET handler (no symbol filtering - returns all US-exchange earnings)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: 'From and to dates are required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('earnings_calendar')
      .select('*')
      .gte('report_date', from)
      .lte('report_date', to)
      .not('symbol', 'like', '%.%')   // Exclude non-US exchanges (e.g. SAP.DE, RY.TO)
      .order('report_date', { ascending: true })
      .range(0, 9999);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch earnings calendar data' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRows(data ?? []));
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

    if (!from || !to) {
      return NextResponse.json(
        { error: 'From and to dates are required' },
        { status: 400 }
      );
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: 'Symbols array is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('earnings_calendar')
      .select('*')
      .gte('report_date', from)
      .lte('report_date', to)
      .in('symbol', symbols)
      .not('symbol', 'like', '%.%')   // Exclude non-US exchanges
      .order('report_date', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch earnings calendar data' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapRows(data ?? []));
  } catch (error) {
    console.error('Error fetching earnings calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar data' },
      { status: 500 }
    );
  }
}
