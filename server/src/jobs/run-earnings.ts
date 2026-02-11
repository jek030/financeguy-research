import dotenv from 'dotenv';
dotenv.config();

/**
 * Standalone earnings sync runner.
 *
 * Uses the Supabase REST API (like the Go sectors job) instead of Prisma,
 * so it only needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and FMP_API_KEY.
 *
 * Runs every business day via GitHub Actions. Logic:
 *   1. Fetch the FMP earnings calendar for [previous business day → 4 weeks out]
 *   2. Upsert into earnings_calendar (update actuals, estimated, report_time, updated_at).
 *      - created_at is never modified after the initial insert.
 *      - If a company's earnings date shifted, the old row stays and the new one is inserted.
 *      - No rows are ever deleted.
 *   3. For companies that recently reported (have eps_actual), fetch and upsert income statements.
 *
 * Usage:  npx tsx src/jobs/run-earnings.ts
 */

// ─── Config ──────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE = 'https://financialmodelingprep.com/api';
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY || !FMP_API_KEY) {
  console.error('[earnings-runner] Missing required environment variables:');
  console.error(`  SUPABASE_URL: ${!!SUPABASE_URL}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${!!SUPABASE_KEY}`);
  console.error(`  FMP_API_KEY: ${!!FMP_API_KEY}`);
  process.exit(1);
}

// ─── Types ───────────────────────────────────────────────

interface CalendarEntry {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
}

interface IncomeStatement {
  date: string;
  symbol: string;
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

// ─── Helpers ─────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Returns the previous business day (Mon-Fri).
 *   Monday    → previous Friday
 *   Sunday    → previous Friday
 *   Saturday  → previous Friday
 *   Tue–Fri   → previous calendar day
 */
function getPreviousBusinessDay(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  if (day === 1) {
    d.setDate(d.getDate() - 3); // Mon → Fri
  } else if (day === 0) {
    d.setDate(d.getDate() - 2); // Sun → Fri
  } else if (day === 6) {
    d.setDate(d.getDate() - 1); // Sat → Fri
  } else {
    d.setDate(d.getDate() - 1); // Tue–Fri → previous day
  }
  return d;
}

// ─── Supabase REST helpers ───────────────────────────────

async function supabase(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    },
  });
}

// ─── FMP API ─────────────────────────────────────────────

async function fetchCalendar(from: string, to: string): Promise<CalendarEntry[]> {
  console.log(`[fmp] Fetching earnings calendar: ${from} → ${to}`);
  const url = `${FMP_BASE}/v3/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP calendar request failed: ${res.status}`);

  const data = (await res.json()) as any[];
  return data
    .filter((d: any) => d.symbol && d.date)
    .map((d: any) => ({
      date: d.date,
      symbol: d.symbol,
      eps: d.eps ?? null,
      epsEstimated: d.epsEstimated ?? null,
      time: d.time || '',
      revenue: d.revenue ?? null,
      revenueEstimated: d.revenueEstimated ?? null,
      fiscalDateEnding: d.fiscalDateEnding || '',
    }));
}

async function fetchIncomeStatements(symbol: string, period: string): Promise<IncomeStatement[]> {
  const url = `${FMP_BASE}/v3/income-statement/${symbol}?period=${period}&apikey=${FMP_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP income statement request failed for ${symbol}: ${res.status}`);

  const data = (await res.json()) as any[];
  return data.map((d: any) => ({
    date: d.date,
    symbol: d.symbol,
    period: d.period,
    revenue: d.revenue ?? 0,
    netIncome: d.netIncome ?? 0,
    epsdiluted: d.epsdiluted ?? 0,
    weightedAverageShsOutDil: d.weightedAverageShsOutDil ?? 0,
    costOfRevenue: d.costOfRevenue ?? 0,
    grossProfit: d.grossProfit ?? 0,
    operatingIncome: d.operatingIncome ?? 0,
    operatingExpenses: d.operatingExpenses ?? 0,
  }));
}

// ─── Earnings calendar sync ──────────────────────────────

/**
 * Upsert calendar entries into Supabase via REST API in batches.
 *
 * On conflict (symbol, report_date):
 *   - Updates eps_actual, revenue_actual, report_time, updated_at always.
 *   - Updates eps_estimated, revenue_estimated, fiscal_date_ending always
 *     (if value differs, Supabase writes the new value; if same, no-op).
 *   - created_at is NOT included, so it is never overwritten after insert.
 *
 * If a company's earnings date shifted (API returns a different report_date),
 * the new (symbol, report_date) combo has no conflict → inserted as a new row.
 * The old row is left untouched.
 */
async function upsertCalendar(entries: CalendarEntry[]): Promise<number> {
  let total = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

    const rows = batch.map((e) => ({
      symbol: e.symbol,
      report_date: e.date,
      fiscal_date_ending: e.fiscalDateEnding || null,
      eps_actual: e.eps,
      eps_estimated: e.epsEstimated,
      revenue_actual: e.revenue != null ? Math.round(e.revenue) : null,
      revenue_estimated: e.revenueEstimated != null ? Math.round(e.revenueEstimated) : null,
      report_time: e.time || null,
      updated_at: now,
    }));

    const res = await supabase('/rest/v1/earnings_calendar?on_conflict=symbol,report_date', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates, return=minimal' },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[sync] Calendar batch ${batchNum}/${totalBatches} failed: ${err}`);
    } else {
      total += batch.length;
      console.log(`[sync] Calendar batch ${batchNum}/${totalBatches}: upserted ${batch.length} rows`);
    }
  }

  return total;
}

// ─── Income statements sync ─────────────────────────────

/**
 * Upsert income statements into Supabase via REST API.
 */
async function upsertIncomeStatements(statements: IncomeStatement[]): Promise<number> {
  if (statements.length === 0) return 0;

  const rows = statements.map((s) => ({
    symbol: s.symbol,
    date: s.date,
    period: s.period,
    revenue: Math.round(s.revenue),
    net_income: Math.round(s.netIncome),
    eps_diluted: s.epsdiluted,
    weighted_avg_shares: Math.round(s.weightedAverageShsOutDil),
    cost_of_revenue: Math.round(s.costOfRevenue),
    gross_profit: Math.round(s.grossProfit),
    operating_income: Math.round(s.operatingIncome),
    operating_expenses: Math.round(s.operatingExpenses),
  }));

  const res = await supabase('/rest/v1/income_statements?on_conflict=symbol,date,period', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates, return=minimal' },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[sync] Income statements upsert failed for ${statements[0]?.symbol}: ${err}`);
    return 0;
  }

  return statements.length;
}

/**
 * Query recently reported companies from Supabase (last 7 days, eps_actual is not null).
 * Uses a 7-day lookback to catch anything missed over weekends or failed runs.
 */
async function getRecentlyReported(from: string, to: string): Promise<string[]> {
  const res = await supabase(
    `/rest/v1/earnings_calendar?select=symbol&report_date=gte.${from}&report_date=lte.${to}&eps_actual=not.is.null`,
    { method: 'GET' },
  );

  if (!res.ok) {
    console.error('[sync] Failed to query recently reported companies');
    return [];
  }

  const rows = (await res.json()) as { symbol: string }[];
  return [...new Set(rows.map((r) => r.symbol))];
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  console.log('[earnings-runner] Starting daily earnings sync...');

  const today = new Date();

  // ── Date range for the earnings calendar API call ──
  // From: previous business day
  // To:   4 weeks from today
  const prevBizDay = getPreviousBusinessDay(today);
  const fourWeeksOut = new Date(today);
  fourWeeksOut.setDate(today.getDate() + 28);

  const calendarFrom = formatDate(prevBizDay);
  const calendarTo = formatDate(fourWeeksOut);

  console.log(`[earnings-runner] Calendar date range: ${calendarFrom} → ${calendarTo}`);

  // Step 1: Fetch earnings calendar from FMP and upsert into Supabase.
  //         - Existing rows (same symbol + report_date) get updated.
  //         - New rows (shifted dates or new symbols) get inserted.
  //         - Nothing is ever deleted.
  const entries = await fetchCalendar(calendarFrom, calendarTo);
  console.log(`[earnings-runner] Fetched ${entries.length} calendar entries from FMP`);

  const calendarCount = await upsertCalendar(entries);
  console.log(`[earnings-runner] Upserted ${calendarCount} calendar entries`);

  // Step 2: Fetch & upsert income statements for recently reported companies.
  //         Uses a 7-day lookback to catch weekends / missed runs.
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const todayStr = formatDate(today);

  const symbols = await getRecentlyReported(formatDate(sevenDaysAgo), todayStr);
  console.log(`[earnings-runner] Found ${symbols.length} companies that reported in the last 7 days`);

  let statementsCount = 0;
  for (const symbol of symbols) {
    try {
      const annual = await fetchIncomeStatements(symbol, 'annual');
      const quarter = await fetchIncomeStatements(symbol, 'quarter');
      statementsCount += await upsertIncomeStatements(annual);
      statementsCount += await upsertIncomeStatements(quarter);
      await sleep(200);
    } catch (err) {
      console.error(`[earnings-runner] Failed for ${symbol}:`, err);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[earnings-runner] Sync completed in ${elapsed}s — ` +
      `${calendarCount} calendar entries, ` +
      `${statementsCount} income statements for ` +
      `${symbols.length} symbols`,
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('[earnings-runner] Fatal error:', err);
  process.exit(1);
});
