import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') as 'annual' | 'quarter' | 'ttm';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  if (!period || !['annual', 'quarter', 'ttm'].includes(period)) {
    return NextResponse.json(
      { error: 'Valid period (annual, quarter, or ttm) is required' },
      { status: 400 }
    );
  }

  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const url = period === 'ttm'
      ? `${FMP_BASE_URL}/v3/key-metrics-ttm/${symbol}?apikey=${FMP_API_KEY}`
      : `${FMP_BASE_URL}/v3/key-metrics/${symbol}?period=${period}&apikey=${FMP_API_KEY}`;

    console.log('Generated URL:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching key metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch key metrics' },
      { status: 500 }
    );
  }
} 