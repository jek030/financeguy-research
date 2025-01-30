import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../../../fmp/config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type');
  const period = searchParams.get('period');
  const timeframe = searchParams.get('timeframe');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  if (!type || !period || !timeframe) {
    return NextResponse.json(
      { error: 'Type, period, and timeframe are required' },
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
    const response = await fetch(
      `${FMP_BASE_URL}/v3/technical_indicator/${timeframe}/${symbol}?type=${type}&period=${period}&apikey=${FMP_API_KEY}`,
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
    console.error('Error fetching moving average data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moving average data' },
      { status: 500 }
    );
  }
} 
