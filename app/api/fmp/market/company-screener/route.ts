import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY } from '../../config';

const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable';

const ALLOWED_PARAMS = [
  'sector',
  'industry',
  'country',
  'exchange',
  'marketCapMoreThan',
  'marketCapLowerThan',
  'priceMoreThan',
  'priceLowerThan',
  'betaMoreThan',
  'betaLowerThan',
  'volumeMoreThan',
  'volumeLowerThan',
  'dividendMoreThan',
  'dividendLowerThan',
  'isEtf',
  'isFund',
  'isActivelyTrading',
  'limit',
] as const;

export async function GET(request: NextRequest) {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key is not configured' },
      { status: 500 }
    );
  }

  const queryParams = new URLSearchParams();

  for (const param of ALLOWED_PARAMS) {
    const value = request.nextUrl.searchParams.get(param);
    if (value && value.trim() !== '') {
      queryParams.set(param, value);
    }
  }

  queryParams.set('apikey', FMP_API_KEY);

  try {
    const response = await fetch(
      `${FMP_STABLE_BASE_URL}/company-screener?${queryParams.toString()}`,
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
    console.error('Error fetching company screener data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company screener data' },
      { status: 500 }
    );
  }
}
