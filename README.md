# FinanceGuy Research Tool

[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000000?style=flat-square&logo=Next.js&logoColor=white)](https://nextjs.org/)
[![Data: FMP](https://img.shields.io/badge/Data-Financial%20Modeling%20Prep-blue?style=flat-square)](https://financialmodelingprep.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A financial research dashboard for investors and traders.

Core app stack:

- Next.js 15 + React 19 + TypeScript
- Supabase (auth + portfolio/watchlist/user preference storage)
- FMP data via internal API routes under `app/api/fmp/*`

## 📊 Features

### 🏠 Home Page
- Dashboard overview of market data and sentiment
- CNN Fear & Greed card (`components/home/FearGreedCard.tsx`)
- NAAIM exposure card (`components/home/NaaimCard.tsx`)
- Sector return tiles + sector overview chart
- Instrument tickers (SPY, QQQ, DIA, SLV, GLD, ^VIX)

### 📅 Calendar
- Interactive earnings calendar displaying companies listed on NYSE and NASDAQ
- Filter by Dow Jones or S&P 500 constituents
- Detailed view of earnings reports with EPS, revenue, and performance metrics
- Color-coded indicators for earnings beats/misses and timing (pre/post-market)

### 📈 FMP Scans
- **Market Sectors Performance**
  - Daily performance tracking across all sectors
  - Drill down into companies within each sector
  - Further drill down to specific industries within sectors
- **Market Movers**
  - Most active stocks tracking
  - Top gainers daily scan

### ⭐ Watchlists
- Login required
- Customizable watchlist functionality
- Persistent storage saved to login
- Track your favorite securities in one place

### 📊 Portfolio Manager
- Login required
- Position table with open/closed filtering, stats, allocation charts, and grouped open-position summaries
- Flexible exits: each position can have dated or planned exits in `tblPositionExits`
- Click a non-option position symbol to open the daily price chart modal with entry/exit markers
- Backtest tab replays fully closed positions against configurable stop and trim rules

### 📁 Transactions → Portfolio Workflow
- Upload brokerage JSON (`app/transactions/page.tsx`)
- Compute summary metrics and action/symbol breakdowns
- Push eligible trade rows into portfolio positions from table actions
- Supports stock and option trade actions (options use 100x share-equivalent quantity)
- Offset mode records a filled exit on an existing position instead of writing fixed target fields

### 🔍 Search Page
- Comprehensive company analysis
- Detailed financial metrics and performance data
- Historical data visualization

### 💰 Crypto Page
- Real-time prices of top cryptocurrencies
- Track performance of major digital assets

### 📚 Resources Page
- Collection of useful financial resources and tools

## 🧭 Architecture and Data Boundaries

### FMP access boundary

Client components should not call FMP directly. FMP requests are proxied through Next API routes:

- `app/api/fmp/*` route handlers
- shared config in `app/api/fmp/config.ts`
- optional server-side helper layer in `lib/server/fmp.ts`

Required env var for these routes:

- `FMP_API_KEY`

### Supabase access boundary

Client-side Supabase reads/writes use:

- `lib/supabase.ts` (browser client)
- user-scoped hooks like `hooks/usePortfolio.ts`

Required env vars for browser auth/data operations:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🔄 Recently Updated Subsystems (Runbook-Level Notes)

### 1) Home sentiment pipeline

Codepaths:

- Page composition: `app/page.tsx`
- Fear & Greed API proxy: `app/api/market/fear-greed/route.ts`
- Fear & Greed hook/card: `hooks/useSupabaseFearGreed.ts`, `components/home/FearGreedCard.tsx`
- NAAIM hook/card: `hooks/useSupabaseNaaim.ts`, `components/home/NaaimCard.tsx`

Behavior:

- Fear & Greed fetches live data from CNN (`/index/fearandgreed/graphdata`) server-side.
- The route caches responses with `revalidate: 300` (5 minutes).
- The card uses CNN's rating text when present; otherwise it derives a 5-tier rating from score.
- NAAIM reads up to 52 most recent rows from Supabase table `market_sentiment_naaim`, sorted descending by `week_ending`.
- NAAIM reference rows are week-based approximations (`1W`, `1M`, `3M`, `6M`) plus 52-week high/low over fetched history.

Operational constraints:

- If CNN changes payload format, `/api/market/fear-greed` returns 500 and the card shows an error state.
- If `market_sentiment_naaim` has stale or missing rows, NAAIM references degrade to partial `--` values.

### 2) NAAIM weekly sync automation

Codepaths:

- Workflow: `.github/workflows/naaim-job.yml`
- Sync script: `scripts/sync_naaim_to_supabase.py`

Schedule:

- Weekly, Wednesdays at `23:30 UTC`

Inputs/secrets used by job:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NAAIM_SOURCE_URL` (or manual workflow input `source_url`)

Manual local run (for troubleshooting):

```bash
python -m pip install --upgrade pip
pip install requests openpyxl
SUPABASE_URL="..." \
SUPABASE_SERVICE_ROLE_KEY="..." \
NAAIM_SOURCE_URL="https://..." \
python scripts/sync_naaim_to_supabase.py
```

Notes:

- Script validates expected XLSX column names and fails fast if schema drifts.
- Upserts into `market_sentiment_naaim` with conflict key `week_ending`.
- Supports `NAAIM_SOURCE_PATH` for local file override.

### 3) Portfolio positions, exits, chart modal, and backtest

Codepaths:

- Page composition: `app/portfolio/page.tsx`
- Portfolio persistence: `hooks/usePortfolio.ts`
- Shared portfolio math: `utils/portfolioCalculations.ts`
- Position chart modal: `components/portfolio/PositionChartModal.tsx`
- Backtest UI/orchestration/math: `components/ui/BacktestTab.tsx`, `hooks/useBacktest.ts`, `utils/backtestCalculations.ts`

Data model:

- Portfolios are stored in `tblPortfolio`; positions are stored in `tblPortfolioPositions`.
- Exits are stored in child rows in `tblPositionExits` and loaded with `.select('*, tblPositionExits (*)')`.
- `exit_date = null` means planned; a non-null `exit_date` means filled.
- Filled exits drive remaining shares, realized gain, R multiple, and whether `close_date` is set.
- Filled exit shares cannot exceed the base position quantity; planned exits can over-allocate.

Chart modal:

- Opens from stock symbols on `/portfolio` position rows; option symbols and summary rows are not clickable.
- Uses `hooks/FMP/useDailyPrices.ts` through `/api/fmp/dailyprices`.
- The `Trade` range starts 30 calendar days before the open date and ends 30 days after the latest dated exit, capped at today.
- Fetches an extra 35 days before the visible range to seed the 21 EMA.
- Renders daily bars on a log scale with entry/exit markers, entry/stop/exit price lines, a 21 EMA, and trade/exits summary tables.

Backtest tab:

- Receives only fully closed positions from `/portfolio`.
- Fetches OHLC from 60 calendar days before open through 30 calendar days after close.
- Fetches moving averages from `/api/fmp/technical/moving-average`.
- ATR uses a simple average of true ranges, not Wilder smoothing.
- Missing FMP data or invalid simulated risk returns a no-data row instead of dropping the trade.

### 4) Transactions → portfolio position mapping

Codepaths:

- Transactions page: `app/transactions/page.tsx`
- Portfolio push modal: `components/ui/(transactions)/AddToPortfolioModal.tsx`
- Portfolio persistence + calculations: `hooks/usePortfolio.ts`
- R-target helper: `utils/portfolioCalculations.ts`

Workflow summary:

1. Upload brokerage JSON; parsed transaction payload is cached in `localStorage` (`transactions-data`).
2. Eligible actions expose a "Portfolio" row action.
3. In "New Position" mode:
   - position type inferred from action (Long/Short)
   - option quantities are converted to share-equivalent (`contracts * 100`)
   - 2R/5R targets are computed from entry vs stop (`calculateRPriceTargets`)
4. In "Offset Existing" mode:
   - offsets call `addExit` for the selected open position
   - the imported transaction date becomes the exit fill date
   - notes are stored on the `tblPositionExits.notes` field when provided

Persistence details that matter:

- `open_risk` is stored as a percentage in DB, then converted back to stop price for UI editing.
- Realized gain, remaining shares, and `close_date` are recalculated from filled exits during exit mutations.
- Portfolio selection precedence combines default preference + localStorage (`financeguy-selected-portfolio`).

## 🚀 Getting Started

```bash
# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## ⚙️ Environment Variables

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
FMP_API_KEY=...
```

Optional:

```bash
NEXT_PUBLIC_SIGNUP_ENABLED=true
```

## 🧪 Troubleshooting

### Home sentiment cards show errors

- Check browser/network call to `/api/market/fear-greed`.
- If 500: inspect server logs for `[sentiment] fear-greed live fetch failed`.
- Confirm outbound network to CNN is available from runtime environment.

### NAAIM card has empty or old values

- Verify latest successful run of `NAAIM Sync (Weekly)` workflow.
- Re-run workflow with `workflow_dispatch` and explicit `source_url` if upstream URL changed.
- Confirm `market_sentiment_naaim` has recent `week_ending` rows.

### "Add to Portfolio" action is missing for a transaction

- Only trade/option actions with both `quantity` and `price` are eligible.
- Non-trade cash/income/expense entries are intentionally excluded.

### New position submit button is disabled

- A portfolio must be selected.
- For equity trades, stop loss must be > 0.
- For options, stop loss is optional (defaults to 0).

### Portfolio values look off after edits

- `updatePosition` recalculates position-level values; `addExit` / `updateExit` / `deleteExit` recalculate realized gain and close status.
- Ensure filled exit shares do not exceed the base position quantity.

### Portfolio chart modal has no data

- Confirm the symbol is a stock row, not an option symbol or summary row.
- Check `/api/fmp/dailyprices?symbol=...&from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Confirm `FMP_API_KEY` is configured server-side.

### Backtest rows show "No price data"

- Backtest depends on `/api/fmp/dailyprices` and `/api/fmp/technical/moving-average`.
- Delisted symbols, sparse history, or a simulated stop at/above entry produce no-data rows.

## 📝 License
This project is for educational purposes.

## 👨‍💻 Credits
Created by [jek030](https://github.com/jek030)