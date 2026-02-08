import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      .order('report_date', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch earnings calendar data' },
        { status: 500 }
      );
    }

    // Map database column names to the shape the frontend expects
    const mapped = (data ?? []).map((row) => ({
      date: row.report_date,
      symbol: row.symbol,
      eps: row.eps_actual,
      epsEstimated: row.eps_estimated,
      time: row.report_time || '',
      revenue: row.revenue_actual ? Number(row.revenue_actual) : null,
      revenueEstimated: row.revenue_estimated ? Number(row.revenue_estimated) : null,
      updatedFromDate: row.updated_at ? row.updated_at.split('T')[0] : '',
      fiscalDateEnding: row.fiscal_date_ending || '',
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching earnings calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings calendar data' },
      { status: 500 }
    );
  }
}
