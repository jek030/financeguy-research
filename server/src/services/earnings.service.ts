import { prisma } from '../db/client';
import type { EarningsCalendarEntry, IncomeStatementEntry } from '../providers/types';

/**
 * Earnings service — read-only queries for the API routes.
 *
 * Write operations (sync, backfill) are handled by the standalone
 * runner script at src/jobs/run-earnings.ts, which uses the Supabase
 * REST API and runs via GitHub Actions.
 */
export class EarningsService {
  /**
   * Get earnings calendar from the database for a date range.
   * Returns data in the same shape as the FMP API for frontend compatibility.
   */
  async getCalendar(from: string, to: string): Promise<EarningsCalendarEntry[]> {
    const records = await prisma.earningsCalendar.findMany({
      where: {
        reportDate: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { reportDate: 'asc' },
    });

    return records.map((r: any) => ({
      date: formatDate(r.reportDate),
      symbol: r.symbol,
      eps: r.epsActual ? Number(r.epsActual) : null,
      epsEstimated: r.epsEstimated ? Number(r.epsEstimated) : null,
      time: r.reportTime || '',
      revenue: r.revenueActual ? Number(r.revenueActual) : null,
      revenueEstimated: r.revenueEstimated ? Number(r.revenueEstimated) : null,
      updatedFromDate: r.updatedAt.toISOString().split('T')[0],
      fiscalDateEnding: r.fiscalDateEnding ? formatDate(r.fiscalDateEnding) : '',
    }));
  }

  /**
   * Get income statements from the database for a symbol.
   * Returns data in the same shape as the FMP API for frontend compatibility.
   */
  async getIncomeStatements(symbol: string, period: 'annual' | 'quarter'): Promise<IncomeStatementEntry[]> {
    const records = await prisma.incomeStatement.findMany({
      where: { symbol, period },
      orderBy: { date: 'desc' },
    });

    return records.map((r: any) => ({
      date: formatDate(r.date),
      symbol: r.symbol,
      fillingDate: formatDate(r.date),
      period: r.period,
      revenue: Number(r.revenue ?? 0),
      netIncome: Number(r.netIncome ?? 0),
      epsdiluted: Number(r.epsDiluted ?? 0),
      weightedAverageShsOutDil: Number(r.weightedAvgShares ?? 0),
      costOfRevenue: Number(r.costOfRevenue ?? 0),
      grossProfit: Number(r.grossProfit ?? 0),
      operatingIncome: Number(r.operatingIncome ?? 0),
      operatingExpenses: Number(r.operatingExpenses ?? 0),
    }));
  }
}

// ---------- Helpers ----------

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
