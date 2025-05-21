import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../config';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const period = searchParams.get('period') || 'annual';

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required' },
      { status: 400 }
    );
  }

  if (!['annual', 'quarter'].includes(period as string)) {
    return NextResponse.json(
      { error: 'Period must be either annual or quarter' },
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
    const url = `${FMP_BASE_URL}/v3/balance-sheet-statement/${symbol}?period=${period}&apikey=${FMP_API_KEY}`;
    
    console.log('Generated URL for balance sheet:', url);

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
    console.error('Error fetching balance sheet data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balance sheet data' },
      { status: 500 }
    );
  }
} 