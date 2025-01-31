import {  NextResponse } from 'next/server';
import { FMP_API_KEY, FMP_BASE_URL } from '../config';

export async function GET() {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${FMP_BASE_URL}/v3/dowjones_constituent?apikey=${FMP_API_KEY}`,
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
    console.error('Error fetching Dow Jones constituents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Dow Jones constituents' },
      { status: 500 }
    );
  }
} 