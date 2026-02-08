import { Prisma } from '@prisma/client';
import { prisma } from '../db/client';
import type { MarketDataProvider, EarningsCalendarEntry, IncomeStatementEntry } from '../providers/types';

const BATCH_SIZE = 500;

/**
 * Earnings service — business logic for syncing and querying earnings data.
 */
export class EarningsService {
  constructor(private provider: MarketDataProvider) {}

  // ---------- Sync (write) operations ----------

  /**
   * Fetch earnings calendar from the provider and batch-upsert into the database.
   *
   * For each symbol, only the **next** upcoming earnings date is kept.
   * Past earnings (already reported) are always kept.
   * After upserting, any extra future earnings per symbol are deleted.
   */
  async syncEarningsCalendar(from: string, to: string): Promise<number> {
    console.log(`[earnings-sync] Fetching calendar from ${this.provider.name}: ${from} to ${to}`);
    const entries = await this.provider.getEarningsCalendar(from, to);
    console.log(`[earnings-sync] Received ${entries.length} calendar entries`);

    // Filter valid entries
    const valid = entries.filter((e) => e.symbol && e.date);

    // For each symbol, keep all past entries + only the nearest future entry
    const filtered = filterToNextEarningsOnly(valid);
    console.log(`[earnings-sync] After filtering to next-earnings-only: ${filtered.length} entries (removed ${valid.length - filtered.length} subsequent future dates)`);

    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
      const batch = filtered.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(filtered.length / BATCH_SIZE);

      try {
        // Build VALUES clause for batch upsert
        const values = batch.map((entry) => {
          const symbol = escapeSql(entry.symbol);
          const reportDate = entry.date;
          const fiscalDateEnding = entry.fiscalDateEnding || null;
          const epsActual = entry.eps ?? null;
          const epsEstimated = entry.epsEstimated ?? null;
          const revenueActual = entry.revenue ? Math.round(entry.revenue) : null;
          const revenueEstimated = entry.revenueEstimated ? Math.round(entry.revenueEstimated) : null;
          const reportTime = entry.time ? escapeSql(entry.time) : null;

          return `('${symbol}', '${reportDate}'::date, ${fiscalDateEnding ? `'${fiscalDateEnding}'::date` : 'NULL'}, ${epsActual ?? 'NULL'}, ${epsEstimated ?? 'NULL'}, ${revenueActual ?? 'NULL'}, ${revenueEstimated ?? 'NULL'}, ${reportTime ? `'${reportTime}'` : 'NULL'}, NOW(), NOW())`;
        });

        const sql = `
          INSERT INTO earnings_calendar (symbol, report_date, fiscal_date_ending, eps_actual, eps_estimated, revenue_actual, revenue_estimated, report_time, updated_at, created_at)
          VALUES ${values.join(',\n')}
          ON CONFLICT (symbol, report_date) DO UPDATE SET
            eps_actual = COALESCE(EXCLUDED.eps_actual, earnings_calendar.eps_actual),
            eps_estimated = COALESCE(EXCLUDED.eps_estimated, earnings_calendar.eps_estimated),
            revenue_actual = COALESCE(EXCLUDED.revenue_actual, earnings_calendar.revenue_actual),
            revenue_estimated = COALESCE(EXCLUDED.revenue_estimated, earnings_calendar.revenue_estimated),
            report_time = COALESCE(EXCLUDED.report_time, earnings_calendar.report_time),
            fiscal_date_ending = COALESCE(EXCLUDED.fiscal_date_ending, earnings_calendar.fiscal_date_ending),
            updated_at = NOW()
        `;

        const result = await prisma.$executeRawUnsafe(sql);
        totalUpserted += result;
        console.log(`[earnings-sync] Calendar batch ${batchNum}/${totalBatches}: upserted ${result} rows`);
      } catch (err) {
        console.error(`[earnings-sync] Calendar batch ${batchNum} failed:`, err);
      }
    }

    // Clean up: delete any future earnings rows that are NOT the nearest upcoming per symbol
    const deleted = await this.deleteSubsequentFutureEarnings();

    console.log(`[earnings-sync] Upserted ${totalUpserted} calendar entries, deleted ${deleted} subsequent future entries`);
    return totalUpserted;
  }

  /**
   * Delete future earnings rows from the database where a symbol has more than
   * one upcoming date — keep only the nearest future date per symbol.
   */
  async deleteSubsequentFutureEarnings(): Promise<number> {
    const today = formatDate(new Date());

    // This CTE finds, for each symbol, the minimum future report_date.
    // Then deletes any rows for that symbol with a future date that is NOT the minimum.
    const sql = `
      DELETE FROM earnings_calendar
      WHERE id IN (
        SELECT ec.id
        FROM earnings_calendar ec
        INNER JOIN (
          SELECT symbol, MIN(report_date) AS next_date
          FROM earnings_calendar
          WHERE report_date >= '${today}'::date
          GROUP BY symbol
        ) next ON ec.symbol = next.symbol
        WHERE ec.report_date > next.next_date
          AND ec.report_date >= '${today}'::date
      )
    `;

    const deleted = await prisma.$executeRawUnsafe(sql);
    if (deleted > 0) {
      console.log(`[earnings-sync] Cleaned up ${deleted} subsequent future earnings entries`);
    }
    return deleted;
  }

  /**
   * Fetch income statements from the provider and batch-upsert into the database.
   */
  async syncIncomeStatements(symbol: string, period: 'annual' | 'quarter'): Promise<number> {
    console.log(`[earnings-sync] Fetching ${period} income statements for ${symbol} from ${this.provider.name}`);
    const statements = await this.provider.getIncomeStatements(symbol, period);
    console.log(`[earnings-sync] Received ${statements.length} income statements for ${symbol}`);

    if (statements.length === 0) return 0;

    try {
      const values = statements.map((stmt) => {
        const sym = escapeSql(stmt.symbol);
        const date = stmt.date;
        const per = escapeSql(stmt.period);
        const revenue = stmt.revenue ? Math.round(stmt.revenue) : null;
        const netIncome = stmt.netIncome ? Math.round(stmt.netIncome) : null;
        const epsDiluted = stmt.epsdiluted ?? null;
        const shares = stmt.weightedAverageShsOutDil ? Math.round(stmt.weightedAverageShsOutDil) : null;
        const costOfRevenue = stmt.costOfRevenue ? Math.round(stmt.costOfRevenue) : null;
        const grossProfit = stmt.grossProfit ? Math.round(stmt.grossProfit) : null;
        const operatingIncome = stmt.operatingIncome ? Math.round(stmt.operatingIncome) : null;
        const operatingExpenses = stmt.operatingExpenses ? Math.round(stmt.operatingExpenses) : null;

        return `('${sym}', '${date}'::date, '${per}', ${revenue ?? 'NULL'}, ${netIncome ?? 'NULL'}, ${epsDiluted ?? 'NULL'}, ${shares ?? 'NULL'}, ${costOfRevenue ?? 'NULL'}, ${grossProfit ?? 'NULL'}, ${operatingIncome ?? 'NULL'}, ${operatingExpenses ?? 'NULL'}, NOW())`;
      });

      const sql = `
        INSERT INTO income_statements (symbol, date, period, revenue, net_income, eps_diluted, weighted_avg_shares, cost_of_revenue, gross_profit, operating_income, operating_expenses, created_at)
        VALUES ${values.join(',\n')}
        ON CONFLICT (symbol, date, period) DO UPDATE SET
          revenue = COALESCE(EXCLUDED.revenue, income_statements.revenue),
          net_income = COALESCE(EXCLUDED.net_income, income_statements.net_income),
          eps_diluted = COALESCE(EXCLUDED.eps_diluted, income_statements.eps_diluted),
          weighted_avg_shares = COALESCE(EXCLUDED.weighted_avg_shares, income_statements.weighted_avg_shares),
          cost_of_revenue = COALESCE(EXCLUDED.cost_of_revenue, income_statements.cost_of_revenue),
          gross_profit = COALESCE(EXCLUDED.gross_profit, income_statements.gross_profit),
          operating_income = COALESCE(EXCLUDED.operating_income, income_statements.operating_income),
          operating_expenses = COALESCE(EXCLUDED.operating_expenses, income_statements.operating_expenses)
      `;

      const result = await prisma.$executeRawUnsafe(sql);
      console.log(`[earnings-sync] Upserted ${result} income statements for ${symbol} (${period})`);
      return result;
    } catch (err) {
      console.error(`[earnings-sync] Failed to upsert income statements for ${symbol}:`, err);
      return 0;
    }
  }

  /**
   * Full sync: earnings calendar + income statements for recently reported companies.
   * This is what the daily cron job calls.
   */
  async runFullSync(): Promise<{ calendarCount: number; statementsCount: number; symbolsSynced: string[] }> {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const from = formatDate(sevenDaysAgo);
    const to = formatDate(ninetyDaysFromNow);

    // Step 1: Sync the earnings calendar
    const calendarCount = await this.syncEarningsCalendar(from, to);

    // Step 2: Find companies that reported in the last 7 days
    const recentlyReported = await prisma.earningsCalendar.findMany({
      where: {
        reportDate: {
          gte: sevenDaysAgo,
          lte: today,
        },
        epsActual: { not: null },
      },
      select: { symbol: true },
      distinct: ['symbol'],
    });

    const symbols = recentlyReported.map((r) => r.symbol);
    console.log(`[earnings-sync] Found ${symbols.length} companies that reported in the last 7 days`);

    // Step 3: Sync income statements for those companies
    let statementsCount = 0;
    for (const symbol of symbols) {
      try {
        const annualCount = await this.syncIncomeStatements(symbol, 'annual');
        const quarterCount = await this.syncIncomeStatements(symbol, 'quarter');
        statementsCount += annualCount + quarterCount;

        // Small delay to avoid hammering the FMP API
        await sleep(200);
      } catch (err) {
        console.error(`[earnings-sync] Failed to sync income statements for ${symbol}:`, err);
      }
    }

    console.log(`[earnings-sync] Full sync complete: ${calendarCount} calendar entries, ${statementsCount} statements for ${symbols.length} symbols`);

    return { calendarCount, statementsCount, symbolsSynced: symbols };
  }

  // ---------- Backfill operations ----------

  /**
   * Backfill the earnings_calendar table from a given start date up to today.
   * Fetches from the provider in monthly chunks to avoid hitting API limits.
   * Skips any (symbol, report_date) that already exists in the table.
   *
   * @param fromDate - Start date YYYY-MM-DD (e.g., '2026-01-01')
   * @returns Total number of new rows inserted
   */
  async backfillCalendar(fromDate: string): Promise<{ inserted: number; skipped: number; chunks: number }> {
    const startTime = Date.now();
    const start = new Date(fromDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`[backfill] Starting earnings calendar backfill from ${fromDate} to ${formatDate(today)}`);

    let totalInserted = 0;
    let totalSkipped = 0;
    let chunkCount = 0;

    // Walk through in monthly chunks
    let chunkStart = new Date(start);
    while (chunkStart < today) {
      const chunkEnd = new Date(chunkStart);
      chunkEnd.setMonth(chunkEnd.getMonth() + 1);
      chunkEnd.setDate(chunkEnd.getDate() - 1); // last day of the month
      if (chunkEnd > today) {
        chunkEnd.setTime(today.getTime());
      }

      const from = formatDate(chunkStart);
      const to = formatDate(chunkEnd);
      chunkCount++;

      console.log(`[backfill] Chunk ${chunkCount}: ${from} to ${to}`);

      try {
        const entries = await this.provider.getEarningsCalendar(from, to);
        const valid = entries.filter((e) => e.symbol && e.date);

        if (valid.length === 0) {
          console.log(`[backfill] Chunk ${chunkCount}: no entries`);
          chunkStart.setMonth(chunkStart.getMonth() + 1);
          chunkStart.setDate(1);
          continue;
        }

        // Batch insert with ON CONFLICT DO NOTHING (skip existing rows)
        for (let i = 0; i < valid.length; i += BATCH_SIZE) {
          const batch = valid.slice(i, i + BATCH_SIZE);

          const values = batch.map((entry) => {
            const symbol = escapeSql(entry.symbol);
            const reportDate = entry.date;
            const fiscalDateEnding = entry.fiscalDateEnding || null;
            const epsActual = entry.eps ?? null;
            const epsEstimated = entry.epsEstimated ?? null;
            const revenueActual = entry.revenue ? Math.round(entry.revenue) : null;
            const revenueEstimated = entry.revenueEstimated ? Math.round(entry.revenueEstimated) : null;
            const reportTime = entry.time ? escapeSql(entry.time) : null;

            return `('${symbol}', '${reportDate}'::date, ${fiscalDateEnding ? `'${fiscalDateEnding}'::date` : 'NULL'}, ${epsActual ?? 'NULL'}, ${epsEstimated ?? 'NULL'}, ${revenueActual ?? 'NULL'}, ${revenueEstimated ?? 'NULL'}, ${reportTime ? `'${reportTime}'` : 'NULL'}, NOW(), NOW())`;
          });

          const sql = `
            INSERT INTO earnings_calendar (symbol, report_date, fiscal_date_ending, eps_actual, eps_estimated, revenue_actual, revenue_estimated, report_time, updated_at, created_at)
            VALUES ${values.join(',\n')}
            ON CONFLICT (symbol, report_date) DO NOTHING
          `;

          const result = await prisma.$executeRawUnsafe(sql);
          totalInserted += result;
          totalSkipped += batch.length - result;
        }

        console.log(`[backfill] Chunk ${chunkCount}: fetched ${valid.length}, inserted ${totalInserted} so far`);
      } catch (err) {
        console.error(`[backfill] Chunk ${chunkCount} (${from} to ${to}) failed:`, err);
      }

      // Small delay between chunks to avoid hammering the API
      await sleep(300);

      // Move to next month
      chunkStart.setMonth(chunkStart.getMonth() + 1);
      chunkStart.setDate(1);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[backfill] Complete in ${elapsed}s — ${totalInserted} new rows inserted, ${totalSkipped} skipped (already existed), ${chunkCount} chunks processed`);

    return { inserted: totalInserted, skipped: totalSkipped, chunks: chunkCount };
  }

  // ---------- Query (read) operations ----------

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

    return records.map((r) => ({
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

    return records.map((r) => ({
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Escape single quotes for SQL string literals. */
function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

/**
 * For each symbol, keep all past entries + only the nearest upcoming entry.
 * If a symbol has future dates 2026-02-10 and 2026-05-04, only 2026-02-10 is kept.
 * Past entries (report_date < today) are always kept.
 */
function filterToNextEarningsOnly(entries: EarningsCalendarEntry[]): EarningsCalendarEntry[] {
  const todayStr = formatDate(new Date());

  // Split into past and future
  const past: EarningsCalendarEntry[] = [];
  const futureBySymbol = new Map<string, EarningsCalendarEntry[]>();

  for (const entry of entries) {
    if (entry.date < todayStr) {
      past.push(entry);
    } else {
      const list = futureBySymbol.get(entry.symbol) || [];
      list.push(entry);
      futureBySymbol.set(entry.symbol, list);
    }
  }

  // For each symbol, keep only the earliest future date
  const filteredFuture: EarningsCalendarEntry[] = [];
  for (const [symbol, futureEntries] of futureBySymbol) {
    futureEntries.sort((a, b) => a.date.localeCompare(b.date));
    filteredFuture.push(futureEntries[0]); // Keep only the nearest upcoming
  }

  return [...past, ...filteredFuture];
}
