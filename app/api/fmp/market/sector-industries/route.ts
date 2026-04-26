import { NextRequest, NextResponse } from 'next/server';
import { FMP_API_KEY } from '../../config';

const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable';

function uniqueSorted(items: string[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item !== '')
    )
  ).sort((a, b) => a.localeCompare(b));
}

function extractIndustriesFromScreener(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];

  return uniqueSorted(
    payload
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const raw = (item as Record<string, unknown>).industry;
        return typeof raw === 'string' ? raw : '';
      })
  );
}

function normalizeIndustryList(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];

  return uniqueSorted(
    payload.map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';

      const objectItem = item as Record<string, unknown>;
      const rawCandidates = [objectItem.industry, objectItem.name, objectItem.value];
      const raw = rawCandidates.find((candidate) => typeof candidate === 'string');
      return typeof raw === 'string' ? raw : '';
    })
  );
}

export async function GET(request: NextRequest) {
  const sector = request.nextUrl.searchParams.get('sector')?.trim();

  if (!sector) {
    return NextResponse.json(
      { error: 'Sector is required' },
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
    const screenerQuery = new URLSearchParams({
      sector,
      limit: '1000',
      isActivelyTrading: 'true',
      apikey: FMP_API_KEY,
    });

    const screenerResponse = await fetch(
      `${FMP_STABLE_BASE_URL}/company-screener?${screenerQuery.toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (screenerResponse.ok) {
      const screenerPayload = await screenerResponse.json();
      const industries = extractIndustriesFromScreener(screenerPayload);
      if (industries.length > 0) {
        return NextResponse.json({ sector, industries, source: 'company-screener' });
      }
    }

    // Fallback: if sector-level derivation is unavailable, return global industry list.
    const industriesResponse = await fetch(
      `${FMP_STABLE_BASE_URL}/available-industries?apikey=${FMP_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!industriesResponse.ok) {
      throw new Error(`Fallback API call failed: ${industriesResponse.statusText}`);
    }

    const industriesPayload = await industriesResponse.json();
    const industries = normalizeIndustryList(industriesPayload);
    return NextResponse.json({ sector, industries, source: 'available-industries' });
  } catch (error) {
    console.error('Error fetching sector industries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch industries for sector' },
      { status: 500 }
    );
  }
}
