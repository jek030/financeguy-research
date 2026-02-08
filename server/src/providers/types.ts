/**
 * Normalized earnings calendar entry.
 * Any data provider must map to this shape.
 */
export interface EarningsCalendarEntry {
  date: string;           // YYYY-MM-DD — the report date
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;           // 'BMO', 'AMC', 'DMH', etc.
  revenue: number | null;
  revenueEstimated: number | null;
  updatedFromDate: string;
  fiscalDateEnding: string;
}

/**
 * Normalized income statement entry.
 * Matches the shape the frontend expects from FMP's /v3/income-statement endpoint.
 */
export interface IncomeStatementEntry {
  date: string;
  symbol: string;
  fillingDate: string;
  period: string;
  revenue: number;
  netIncome: number;
  epsdiluted: number;
  weightedAverageShsOutDil: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  operatingExpenses: number;
}

/**
 * Interface that any market data provider must implement.
 * This is the abstraction layer that lets us swap APIs without changing business logic.
 */
export interface MarketDataProvider {
  readonly name: string;

  /**
   * Fetch earnings calendar for a date range.
   */
  getEarningsCalendar(from: string, to: string): Promise<EarningsCalendarEntry[]>;

  /**
   * Fetch income statements for a symbol.
   * @param period - 'annual' or 'quarter'
   */
  getIncomeStatements(symbol: string, period: 'annual' | 'quarter'): Promise<IncomeStatementEntry[]>;
}
