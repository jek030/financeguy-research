import "server-only";
import type { CompanyOutlook, Ticker } from "@/lib/types";
import { FMP_API_KEY, FMP_BASE_URL } from "@/app/api/fmp/config";

interface RawCompanyOutlook {
  profile?: unknown;
  metrics?: unknown;
  ratios?: unknown[];
  keyExecutives?: unknown[];
  stockSplitHistory?: unknown[];
  stockDividend?: unknown[];
  stockNews?: unknown[];
  rating?: unknown[];
  financialsAnnual?: {
    income?: unknown[];
  };
  financialsQuarter?: {
    income?: unknown[];
  };
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

async function fetchFmpJson<T>(path: string): Promise<T> {
  if (!FMP_API_KEY) {
    throw new Error("API key is not configured");
  }

  const response = await fetch(`${FMP_BASE_URL}${path}&apikey=${FMP_API_KEY}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

function mapCompanyOutlook(rawData: RawCompanyOutlook): CompanyOutlook {
  return {
    profile: rawData.profile || null,
    metrics: rawData.metrics || null,
    ratios: rawData.ratios || [],
    keyExecutives: rawData.keyExecutives || [],
    splitsHistory: rawData.stockSplitHistory || [],
    stockDividend: rawData.stockDividend || [],
    stockNews: rawData.stockNews || [],
    rating: rawData.rating || [],
    financialsAnnual: {
      income: rawData.financialsAnnual?.income || [],
    },
    financialsQuarter: {
      income: rawData.financialsQuarter?.income || [],
    },
  } as CompanyOutlook;
}

export async function fetchServerQuote(symbol: string): Promise<Ticker | undefined> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return undefined;
  }

  try {
    const data = await fetchFmpJson<Ticker[]>(`/v3/quote/${normalized}?`);
    return data[0];
  } catch (error) {
    console.error("Error fetching quote data:", error);
    return undefined;
  }
}

export async function fetchServerCompanyOutlook(symbol: string): Promise<CompanyOutlook | undefined> {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    return undefined;
  }

  try {
    const rawData = await fetchFmpJson<RawCompanyOutlook>(`/v4/company-outlook?symbol=${normalized}&`);
    return mapCompanyOutlook(rawData);
  } catch (error) {
    console.error("Error fetching company data:", error);
    return undefined;
  }
}
