import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY } from '../config';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
  }

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/stable/aftermarket-trade?symbol=${symbol}&apikey=${FMP_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    );

    if (!response.ok) {
      throw new Error(`FMP API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching aftermarket trade data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aftermarket trade data' },
      { status: 500 }
    );
  }
}
