import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
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
    // Use the correct endpoint for v4 stable dividends API
    const response = await fetch(
      `https://financialmodelingprep.com/stable/dividends?symbol=${symbol}&apikey=${FMP_API_KEY}`,
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
    console.error('Error fetching dividend history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dividend history' },
      { status: 500 }
    );
  }
} 