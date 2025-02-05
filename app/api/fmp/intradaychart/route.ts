import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../config';

export async function GET(request: NextRequest) {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { error: 'Symbol and timeframe are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
    if (from && !dateRegex.test(from)) {
      return NextResponse.json(
        { error: 'From date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    if (to && !dateRegex.test(to)) {
      return NextResponse.json(
        { error: 'To date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    let url = `${FMP_BASE_URL}/v3/historical-chart/${timeframe}/${symbol}?apikey=${FMP_API_KEY}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const response = await fetch(
      url,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching intraday chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intraday chart data' },
      { status: 500 }
    );
  }
} 