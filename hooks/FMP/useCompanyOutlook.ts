import { useQuery } from '@tanstack/react-query';
import { CompanyOutlook } from '@/lib/types';

async function fetchCompanyOutlook(symbol: string): Promise<CompanyOutlook> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/companyoutlook?symbol=${symbol}`);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const rawData = await response.json();

  // Map the raw data to our CompanyOutlook type
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
      income: (rawData.financialsAnnual?.income || []),
    },
    financialsQuarter: {
      income: (rawData.financialsQuarter?.income || []),
    },
  } as CompanyOutlook;
}

export function useCompanyOutlook(symbol: string) {
  return useQuery({
    queryKey: ['company-outlook', symbol],
    queryFn: () => fetchCompanyOutlook(symbol),
    enabled: Boolean(symbol),
  });
}