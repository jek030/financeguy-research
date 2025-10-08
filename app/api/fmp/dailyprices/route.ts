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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!symbol || !from || !to) {
      return NextResponse.json(
        { error: 'Symbol, from, and to dates are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
    if (!dateRegex.test(from)) {
      return NextResponse.json(
        { error: 'From date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    if (!dateRegex.test(to)) {
      return NextResponse.json(
        { error: 'To date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${FMP_BASE_URL}/v3/historical-price-full/${symbol}?from=${from}&to=${to}&apikey=${FMP_API_KEY}`,
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
    console.log('FMP API Response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching daily price data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily price data' },
      { status: 500 }
    );
  }
} 