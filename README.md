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

### 📁 Transactions → Portfolio Workflow
- Upload brokerage JSON (`app/transactions/page.tsx`)
- Compute summary metrics and action/symbol breakdowns
- Push eligible trade rows into portfolio positions from table actions
- Supports stock and option trade actions (options use 100x share-equivalent quantity)

### 🧪 Portfolio Backtesting
- Backtest tab on `/portfolio` for fully closed positions
- Replays trades against configurable stop methods and trim/trail exit rules
- Compares simulated R, gain/loss, days held, and outcome against actual closed-trade results

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

### 3) Transactions → portfolio position mapping

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
   - offsets write into PT1/PT2/21-day-trail fields for the selected open position
   - trail mode can close the position by setting `closedDate`

Persistence details that matter:

- `open_risk` is stored as a percentage in DB, then converted back to stop price for UI editing.
- Realized gain and remaining shares are recalculated during position updates.
- Portfolio selection precedence combines default preference + localStorage (`financeguy-selected-portfolio`).

### 4) Portfolio Backtest tab

Codepaths:

- Tab wiring: `app/portfolio/page.tsx`
- UI: `components/ui/BacktestTab.tsx`
- Fetch orchestration: `hooks/useBacktest.ts`
- Pure simulation logic: `utils/backtestCalculations.ts`
- Existing FMP proxies used by the hook:
  - `/api/fmp/dailyprices`
  - `/api/fmp/technical/moving-average`

Workflow summary:

1. Open `/portfolio` and select the Backtest tab.
2. Only fully closed positions are passed into the tab (`isPositionFullyClosed`), so partially closed/open positions are excluded.
3. Configure a stop method:
   - Low of entry day
   - ATR-based stop (`entry - ATR multiplier * ATR`)
   - Straight percent below entry
   - Trailing moving average stop
4. Configure trim/trail rules. Defaults are 1/3 at 2R, 1/3 at 5R, and final exit on 21 EMA.
5. Click "Run Backtest"; each closed trade fetches OHLC and moving-average data, then renders progressively as results complete.

Simulation constraints:

- The hook fetches OHLC from 60 calendar days before entry through 30 calendar days after the actual close date.
- ATR uses a simple average of true ranges, not Wilder's smoothed ATR.
- Stop checks run before trim checks on each simulated day; a stop breach does not receive same-day trim credit.
- Moving-average stop data is fetched only when the trailing MA stop method is selected; trail-exit MA data is always fetched.
- Trades with missing FMP data or invalid simulated risk return a "No price data available" row and are excluded from summary totals.
- Actual R uses stored realized gain and initial stop loss; simulated R uses the simulated stop and weighted average simulated exit.

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

- `updatePosition` recalculates derived fields (`remaining_shares`, `realized_gain`, `% portfolio`) from current + updated values.
- Ensure PT share quantities and base quantity are consistent (PT1 + PT2 should not exceed total quantity).

### Backtest rows show "No price data available"

- Confirm `/api/fmp/dailyprices` returns candles for the symbol around the trade dates.
- Confirm `/api/fmp/technical/moving-average` returns the requested EMA/SMA field and date values.
- Check whether the simulated stop is above/at entry; invalid 1R risk is treated as no sim data.
- Delisted symbols, sparse FMP history, and missing moving-average fields can affect individual rows without breaking the whole run.

## 📝 License
This project is for educational purposes.

## 👨‍💻 Credits
Created by [jek030](https://github.com/jek030)