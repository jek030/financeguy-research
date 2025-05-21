import { useQueries } from '@tanstack/react-query';

export interface BalanceSheetStatement {
  date: string;
  symbol: string;
  fillingDate: string;
  acceptedDate: string;
  period: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
  link: string;
  finalLink: string;
}

async function fetchBalanceSheet(symbol: string, period: 'annual' | 'quarter'): Promise<BalanceSheetStatement[]> {
  if (!symbol) {
    throw new Error('Symbol is required');
  }

  const response = await fetch(`/api/fmp/balance-sheet?symbol=${symbol}&period=${period}`);

  if (!response.ok) {
    throw new Error('Failed to fetch balance sheet data');
  }

  return response.json();
}

export function useBalanceSheet(symbol: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['balance-sheet', symbol, 'annual'],
        queryFn: () => fetchBalanceSheet(symbol, 'annual'),
        enabled: Boolean(symbol),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
      },
      {
        queryKey: ['balance-sheet', symbol, 'quarter'],
        queryFn: () => fetchBalanceSheet(symbol, 'quarter'),
        enabled: Boolean(symbol),
        staleTime: 24 * 60 * 60 * 1000, // 24 hours
      },
    ],
  });

  return {
    annualData: results[0].data,
    quarterlyData: results[1].data,
    isLoading: results.some(result => result.isLoading),
    error: results.find(result => result.error)?.error,
  };
} 