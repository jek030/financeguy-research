import { useQuery } from '@tanstack/react-query';

export interface CompanyScreenerFilters {
  sector?: string;
  industry?: string;
  country?: string;
  exchange?: string;
  marketCapMoreThan?: number;
  marketCapLowerThan?: number;
  priceMoreThan?: number;
  priceLowerThan?: number;
  betaMoreThan?: number;
  betaLowerThan?: number;
  volumeMoreThan?: number;
  volumeLowerThan?: number;
  dividendMoreThan?: number;
  dividendLowerThan?: number;
  isEtf?: boolean;
  isFund?: boolean;
  isActivelyTrading?: boolean;
  limit?: number;
}

export interface CompanyScreenerItem {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  lastAnnualDividend: number;
  volume: number;
  exchange: string;
  exchangeShortName: string;
  country: string;
  isEtf: boolean;
  isFund?: boolean;
  isActivelyTrading: boolean;
}

function toQueryString(filters: CompanyScreenerFilters): string {
  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(filters)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed === '') {
        continue;
      }
      searchParams.set(key, trimmed);
      continue;
    }

    if (typeof rawValue === 'number') {
      if (Number.isNaN(rawValue)) {
        continue;
      }
      searchParams.set(key, String(rawValue));
      continue;
    }

    searchParams.set(key, rawValue ? 'true' : 'false');
  }

  return searchParams.toString();
}

async function fetchCompanyScreener(filters: CompanyScreenerFilters): Promise<CompanyScreenerItem[]> {
  const queryString = toQueryString(filters);
  const response = await fetch(`/api/fmp/market/company-screener${queryString ? `?${queryString}` : ''}`);

  if (!response.ok) {
    throw new Error('Failed to fetch company screener data');
  }

  return response.json();
}

export function useCompanyScreener(
  filters: CompanyScreenerFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['company-screener', filters],
    queryFn: () => fetchCompanyScreener(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
