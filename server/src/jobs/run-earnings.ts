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
 * Usage:
 *   npx tsx src/jobs/run-earnings.ts
 *   npx tsx src/jobs/run-earnings.ts --reconcile-only --dry-run --lookback-days=3650
 */

// ─── Config ──────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE = 'https://financialmodelingprep.com/api';
const BATCH_SIZE = 500;
const PAGINATION_SIZE = 1000;
const DEFAULT_RECONCILE_LOOKBACK_DAYS = 120;
const RECONCILE_FUTURE_DAYS = 21;
const RECONCILE_MAX_DATE_DIFF_DAYS = 14;

const STARTUP_FLAGS = parseFlags(process.argv.slice(2));
const requiresFmp = !STARTUP_FLAGS.reconcileOnly;

if (!SUPABASE_URL || !SUPABASE_KEY || (requiresFmp && !FMP_API_KEY)) {
  console.error('[earnings-runner] Missing required environment variables:');
  console.error(`  SUPABASE_URL: ${!!SUPABASE_URL}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${!!SUPABASE_KEY}`);
  console.error(`  FMP_API_KEY: ${!!FMP_API_KEY} ${requiresFmp ? '(required)' : '(optional for reconcile-only)'}`);
  process.exit(1);
}

if (STARTUP_FLAGS.dryRun && !STARTUP_FLAGS.reconcileOnly) {
  console.error('[earnings-runner] --dry-run is only supported with --reconcile-only');
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

interface ExistingActualRow {
  symbol: string;
  report_date: string;
  eps_actual: number | null;
  revenue_actual: number | null;
}

interface ReconcileCandidateRow {
  id: number;
  symbol: string;
  report_date: string;
  fiscal_date_ending: string | null;
  eps_actual: number | null;
  revenue_actual: number | null;
  is_active: boolean;
}

interface ReconcileStats {
  rowsReconciled: number;
  rowsSuperseded: number;
  ambiguousConflicts: number;
  scannedSymbols: number;
  scannedRows: number;
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function rowKey(symbol: string, reportDate: string): string {
  return `${symbol}__${reportDate}`;
}

function parseFlags(argv: string[]) {
  const dryRun = argv.includes('--dry-run');
  const reconcileOnly = argv.includes('--reconcile-only');
  const lookbackArg = argv.find((arg) => arg.startsWith('--lookback-days='));
  let lookbackDays = DEFAULT_RECONCILE_LOOKBACK_DAYS;

  if (lookbackArg) {
    const raw = lookbackArg.split('=')[1];
    const parsed = Number(raw);
    if (!Number.isNaN(parsed) && parsed > 0) {
      lookbackDays = Math.floor(parsed);
    }
  }

  return { dryRun, reconcileOnly, lookbackDays };
}

function hasActuals(row: Pick<ReconcileCandidateRow, 'eps_actual' | 'revenue_actual'>): boolean {
  return row.eps_actual !== null || row.revenue_actual !== null;
}

function getDateDiffDays(a: string, b: string): number {
  const aTime = new Date(`${a}T00:00:00Z`).getTime();
  const bTime = new Date(`${b}T00:00:00Z`).getTime();
  return Math.abs(Math.round((aTime - bTime) / (1000 * 60 * 60 * 24)));
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

async function getExistingCalendarActuals(from: string, to: string): Promise<Map<string, { epsActual: number | null; revenueActual: number | null }>> {
  const existingMap = new Map<string, { epsActual: number | null; revenueActual: number | null }>();
  let offset = 0;

  while (true) {
    const res = await supabase(
      `/rest/v1/earnings_calendar?select=symbol,report_date,eps_actual,revenue_actual&report_date=gte.${from}&report_date=lte.${to}&limit=${PAGINATION_SIZE}&offset=${offset}`,
      { method: 'GET' },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[sync] Failed to query existing calendar rows for null-safe merge: ${err}`);
    }

    const rows = (await res.json()) as ExistingActualRow[];
    for (const row of rows) {
      existingMap.set(rowKey(row.symbol, row.report_date), {
        epsActual: toNullableNumber(row.eps_actual),
        revenueActual: toNullableNumber(row.revenue_actual),
      });
    }

    if (rows.length < PAGINATION_SIZE) break;
    offset += PAGINATION_SIZE;
  }

  return existingMap;
}

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
async function upsertCalendar(
  entries: CalendarEntry[],
  existingActuals: Map<string, { epsActual: number | null; revenueActual: number | null }>,
): Promise<number> {
  let total = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

    const rows = batch.map((e) => {
      const key = rowKey(e.symbol, e.date);
      const existing = existingActuals.get(key);
      const incomingRevenue = e.revenue != null ? Math.round(e.revenue) : null;
      const incomingEps = e.eps;
      const hasIncomingActuals = incomingEps !== null || incomingRevenue !== null;

      return {
        symbol: e.symbol,
        report_date: e.date,
        fiscal_date_ending: e.fiscalDateEnding || null,
        // Null-safe merge: keep existing non-null actuals if provider returns null.
        eps_actual: incomingEps ?? existing?.epsActual ?? null,
        eps_estimated: e.epsEstimated,
        revenue_actual: incomingRevenue ?? existing?.revenueActual ?? null,
        revenue_estimated: e.revenueEstimated != null ? Math.round(e.revenueEstimated) : null,
        report_time: e.time || null,
        ...(hasIncomingActuals
          ? {
              is_active: true,
              superseded_by_id: null,
              superseded_reason: null,
            }
          : {}),
        updated_at: now,
      };
    });

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

async function getActiveRowsForReconciliation(from: string, to: string): Promise<ReconcileCandidateRow[]> {
  const rows: ReconcileCandidateRow[] = [];
  let offset = 0;

  while (true) {
    const res = await supabase(
      `/rest/v1/earnings_calendar?select=id,symbol,report_date,fiscal_date_ending,eps_actual,revenue_actual,is_active&is_active=eq.true&report_date=gte.${from}&report_date=lte.${to}&order=symbol.asc,report_date.asc&limit=${PAGINATION_SIZE}&offset=${offset}`,
      { method: 'GET' },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[reconcile] Failed to query active earnings rows: ${err}`);
    }

    const batch = (await res.json()) as ReconcileCandidateRow[];
    rows.push(...batch.map((row) => ({
      ...row,
      eps_actual: toNullableNumber(row.eps_actual),
      revenue_actual: toNullableNumber(row.revenue_actual),
    })));

    if (batch.length < PAGINATION_SIZE) break;
    offset += PAGINATION_SIZE;
  }

  return rows;
}

async function supersedeRow(
  sourceRowId: number,
  targetRowId: number,
  reason: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;

  const res = await supabase(`/rest/v1/earnings_calendar?id=eq.${sourceRowId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      is_active: false,
      superseded_by_id: targetRowId,
      superseded_reason: reason,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`[reconcile] Failed to supersede row ${sourceRowId}: ${err}`);
  }
}

function pickBestCandidate(
  source: ReconcileCandidateRow,
  completeRows: ReconcileCandidateRow[],
): { best: ReconcileCandidateRow | null; ambiguous: boolean } {
  const sameFiscalEndingCandidates = completeRows.filter((row) =>
    source.fiscal_date_ending &&
    row.fiscal_date_ending &&
    source.fiscal_date_ending === row.fiscal_date_ending &&
    getDateDiffDays(source.report_date, row.report_date) <= RECONCILE_MAX_DATE_DIFF_DAYS
  );

  const candidatePool = sameFiscalEndingCandidates.length > 0
    ? sameFiscalEndingCandidates
    : completeRows.filter(
        (row) => getDateDiffDays(source.report_date, row.report_date) <= RECONCILE_MAX_DATE_DIFF_DAYS,
      );

  if (candidatePool.length === 0) {
    return { best: null, ambiguous: false };
  }

  let best: ReconcileCandidateRow | null = null;
  let bestDiff = Number.MAX_SAFE_INTEGER;
  let ambiguous = false;

  for (const candidate of candidatePool) {
    const diff = getDateDiffDays(source.report_date, candidate.report_date);
    if (diff < bestDiff) {
      best = candidate;
      bestDiff = diff;
      ambiguous = false;
    } else if (diff === bestDiff) {
      ambiguous = true;
    }
  }

  return { best: ambiguous ? null : best, ambiguous };
}

async function reconcileShiftedDateRows(from: string, to: string, dryRun: boolean): Promise<ReconcileStats> {
  const rows = await getActiveRowsForReconciliation(from, to);
  const bySymbol = new Map<string, ReconcileCandidateRow[]>();
  for (const row of rows) {
    const existing = bySymbol.get(row.symbol) || [];
    existing.push(row);
    bySymbol.set(row.symbol, existing);
  }

  const stats: ReconcileStats = {
    rowsReconciled: 0,
    rowsSuperseded: 0,
    ambiguousConflicts: 0,
    scannedSymbols: bySymbol.size,
    scannedRows: rows.length,
  };

  for (const [symbol, symbolRows] of bySymbol.entries()) {
    if (symbolRows.length < 2) continue;

    const incompleteRows = symbolRows.filter((row) => !hasActuals(row));
    const completeRows = symbolRows.filter((row) => hasActuals(row));
    if (incompleteRows.length === 0 || completeRows.length === 0) continue;

    for (const sourceRow of incompleteRows) {
      const { best, ambiguous } = pickBestCandidate(sourceRow, completeRows);
      if (ambiguous) {
        stats.ambiguousConflicts += 1;
        continue;
      }
      if (!best) continue;

      try {
        await supersedeRow(sourceRow.id, best.id, 'date_shift_with_actuals', dryRun);
        stats.rowsReconciled += 1;
        stats.rowsSuperseded += 1;
      } catch (error) {
        console.error(`[reconcile] Failed to reconcile ${symbol} source row ${sourceRow.id} -> ${best.id}:`, error);
      }
    }
  }

  return stats;
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
    `/rest/v1/earnings_calendar?select=symbol&is_active=eq.true&report_date=gte.${from}&report_date=lte.${to}&eps_actual=not.is.null`,
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
  const { dryRun, reconcileOnly, lookbackDays } = STARTUP_FLAGS;
  console.log(
    `[earnings-runner] Flags — dryRun=${dryRun}, reconcileOnly=${reconcileOnly}, lookbackDays=${lookbackDays}`,
  );

  const today = new Date();
  let calendarCount = 0;
  let statementsCount = 0;
  let symbolsCount = 0;

  if (!reconcileOnly) {
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

    const existingActuals = await getExistingCalendarActuals(calendarFrom, calendarTo);
    calendarCount = await upsertCalendar(entries, existingActuals);
    console.log(`[earnings-runner] Upserted ${calendarCount} calendar entries`);

    // Step 2: Fetch & upsert income statements for recently reported companies.
    //         Uses a 7-day lookback to catch weekends / missed runs.
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const todayStr = formatDate(today);

    const symbols = await getRecentlyReported(formatDate(sevenDaysAgo), todayStr);
    symbolsCount = symbols.length;
    console.log(`[earnings-runner] Found ${symbols.length} companies that reported in the last 7 days`);

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
  }

  // Step 3: Reconcile shifted-date duplicates to keep one canonical active row.
  const reconcileFromDate = new Date(today);
  reconcileFromDate.setDate(today.getDate() - lookbackDays);
  const reconcileToDate = new Date(today);
  reconcileToDate.setDate(today.getDate() + RECONCILE_FUTURE_DAYS);
  const reconcileFrom = formatDate(reconcileFromDate);
  const reconcileTo = formatDate(reconcileToDate);
  console.log(`[earnings-runner] Reconciliation date range: ${reconcileFrom} → ${reconcileTo}`);

  const reconcileStats = await reconcileShiftedDateRows(reconcileFrom, reconcileTo, dryRun);
  console.log(
    `[earnings-runner] Reconcile stats — ` +
      `rows_reconciled=${reconcileStats.rowsReconciled}, ` +
      `rows_superseded=${reconcileStats.rowsSuperseded}, ` +
      `ambiguous_conflicts=${reconcileStats.ambiguousConflicts}, ` +
      `scanned_symbols=${reconcileStats.scannedSymbols}, ` +
      `scanned_rows=${reconcileStats.scannedRows}`,
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[earnings-runner] Sync completed in ${elapsed}s — ` +
      `${calendarCount} calendar entries, ` +
      `${statementsCount} income statements for ` +
      `${symbolsCount} symbols`,
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('[earnings-runner] Fatal error:', err);
  process.exit(1);
});
