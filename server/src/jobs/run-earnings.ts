import dotenv from 'dotenv';
dotenv.config();

/**
 * Standalone earnings sync runner.
 *
 * Uses the Supabase REST API (like the Go sectors job) instead of Prisma,
 * so it only needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and FMP_API_KEY.
 *
 * Designed to be invoked directly from GitHub Actions or CLI:
 *   npx tsx src/jobs/run-earnings.ts
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

// ─── Sync logic ──────────────────────────────────────────

/**
 * Keep all past entries + only the nearest upcoming future entry per symbol.
 */
function filterToNextEarningsOnly(entries: CalendarEntry[]): CalendarEntry[] {
  const todayStr = formatDate(new Date());
  const past: CalendarEntry[] = [];
  const futureBySymbol = new Map<string, CalendarEntry[]>();

  for (const entry of entries) {
    if (entry.date < todayStr) {
      past.push(entry);
    } else {
      const list = futureBySymbol.get(entry.symbol) || [];
      list.push(entry);
      futureBySymbol.set(entry.symbol, list);
    }
  }

  const filtered: CalendarEntry[] = [];
  for (const [, futures] of futureBySymbol) {
    futures.sort((a, b) => a.date.localeCompare(b.date));
    filtered.push(futures[0]);
  }

  return [...past, ...filtered];
}

/**
 * Upsert calendar entries into Supabase via REST API in batches.
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

/**
 * Delete future earnings entries where a symbol has more than one upcoming date.
 * Keeps only the nearest future date per symbol.
 */
async function cleanupFutureEarnings(): Promise<number> {
  const today = formatDate(new Date());

  const res = await supabase(
    `/rest/v1/earnings_calendar?select=id,symbol,report_date&report_date=gte.${today}&order=symbol.asc,report_date.asc`,
    { method: 'GET' },
  );

  if (!res.ok) {
    console.error('[sync] Failed to fetch future earnings for cleanup');
    return 0;
  }

  const rows = (await res.json()) as { id: number; symbol: string; report_date: string }[];

  // For each symbol, keep only the earliest future entry — mark the rest for deletion
  const seen = new Set<string>();
  const toDelete: number[] = [];

  for (const row of rows) {
    if (seen.has(row.symbol)) {
      toDelete.push(row.id);
    } else {
      seen.add(row.symbol);
    }
  }

  if (toDelete.length === 0) return 0;

  // Delete in batches
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    const ids = toDelete.slice(i, i + BATCH_SIZE).join(',');
    const del = await supabase(`/rest/v1/earnings_calendar?id=in.(${ids})`, {
      method: 'DELETE',
    });
    if (!del.ok) {
      console.error(`[sync] Failed to delete stale future entries: ${await del.text()}`);
    }
  }

  return toDelete.length;
}

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
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  const from = formatDate(sevenDaysAgo);
  const to = formatDate(ninetyDaysFromNow);

  // Step 1: Fetch & upsert earnings calendar
  const entries = await fetchCalendar(from, to);
  console.log(`[earnings-runner] Fetched ${entries.length} calendar entries from FMP`);

  const filtered = filterToNextEarningsOnly(entries);
  console.log(`[earnings-runner] After filtering: ${filtered.length} entries (removed ${entries.length - filtered.length} subsequent future dates)`);

  const calendarCount = await upsertCalendar(filtered);
  console.log(`[earnings-runner] Upserted ${calendarCount} calendar entries`);

  const deleted = await cleanupFutureEarnings();
  if (deleted > 0) console.log(`[earnings-runner] Cleaned up ${deleted} stale future entries`);

  // Step 2: Fetch & upsert income statements for recently reported companies
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
