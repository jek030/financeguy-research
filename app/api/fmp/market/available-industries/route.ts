import { NextResponse } from 'next/server';
import { FMP_API_KEY } from '../../config';

const FMP_STABLE_BASE_URL = 'https://financialmodelingprep.com/stable';

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (item && typeof item === 'object') {
        const objectItem = item as Record<string, unknown>;
        const candidates = ['industry', 'name', 'value'];

        for (const candidate of candidates) {
          const raw = objectItem[candidate];
          if (typeof raw === 'string' && raw.trim() !== '') {
            return raw.trim();
          }
        }

        for (const raw of Object.values(objectItem)) {
          if (typeof raw === 'string' && raw.trim() !== '') {
            return raw.trim();
          }
        }
      }

      return '';
    })
    .filter((item) => item !== '');

  return Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));
}

export async function GET() {
  if (!FMP_API_KEY) {
    return NextResponse.json(
      { error: 'API key is not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${FMP_STABLE_BASE_URL}/available-industries?apikey=${FMP_API_KEY}`,
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
    return NextResponse.json(normalizeStringList(data));
  } catch (error) {
    console.error('Error fetching available industries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available industries' },
      { status: 500 }
    );
  }
}
