import { useQuery } from '@tanstack/react-query';
import { CompanyOutlook } from '@/lib/types';

const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY || '';

async function fetchCompanyOutlook(symbol: string) {
  if (!symbol || !apiKey) {
    throw new Error('Symbol and API key are required');
  }

  const response = await fetch(
    `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${symbol}&apikey=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const rawData = await response.json();

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
    enabled: Boolean(symbol && apiKey),
  });
}