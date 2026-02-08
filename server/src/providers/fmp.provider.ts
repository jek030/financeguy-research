import { env } from '../config/env';
import type {
  MarketDataProvider,
  EarningsCalendarEntry,
  IncomeStatementEntry,
} from './types';

const FMP_BASE_URL = 'https://financialmodelingprep.com/api';

/**
 * Financial Modeling Prep (FMP) implementation of MarketDataProvider.
 */
export class FMPProvider implements MarketDataProvider {
  readonly name = 'FMP';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = env.FMP_API_KEY;
  }

  async getEarningsCalendar(from: string, to: string): Promise<EarningsCalendarEntry[]> {
    const url = `${FMP_BASE_URL}/v3/earning_calendar?from=${from}&to=${to}&apikey=${this.apiKey}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`FMP earnings calendar request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as FMPEarningsCalendarResponse[];

    // Map FMP response to our normalized shape
    return data.map((item) => ({
      date: item.date,
      symbol: item.symbol,
      eps: item.eps,
      epsEstimated: item.epsEstimated,
      time: item.time || '',
      revenue: item.revenue,
      revenueEstimated: item.revenueEstimated,
      updatedFromDate: item.updatedFromDate || '',
      fiscalDateEnding: item.fiscalDateEnding || '',
    }));
  }

  async getIncomeStatements(symbol: string, period: 'annual' | 'quarter'): Promise<IncomeStatementEntry[]> {
    const url = `${FMP_BASE_URL}/v3/income-statement/${symbol}?period=${period}&apikey=${this.apiKey}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`FMP income statement request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as FMPIncomeStatementResponse[];

    // Map FMP response to our normalized shape
    return data.map((item) => ({
      date: item.date,
      symbol: item.symbol,
      fillingDate: item.fillingDate || '',
      period: item.period,
      revenue: item.revenue ?? 0,
      netIncome: item.netIncome ?? 0,
      epsdiluted: item.epsdiluted ?? 0,
      weightedAverageShsOutDil: item.weightedAverageShsOutDil ?? 0,
      costOfRevenue: item.costOfRevenue ?? 0,
      grossProfit: item.grossProfit ?? 0,
      operatingIncome: item.operatingIncome ?? 0,
      operatingExpenses: item.operatingExpenses ?? 0,
    }));
  }
}

// ---------- FMP raw response types ----------

interface FMPEarningsCalendarResponse {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string | null;
  revenue: number | null;
  revenueEstimated: number | null;
  updatedFromDate: string | null;
  fiscalDateEnding: string | null;
}

interface FMPIncomeStatementResponse {
  date: string;
  symbol: string;
  fillingDate: string | null;
  period: string;
  revenue: number | null;
  netIncome: number | null;
  epsdiluted: number | null;
  weightedAverageShsOutDil: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  operatingExpenses: number | null;
  // FMP returns many more fields — add as needed
  [key: string]: unknown;
}
