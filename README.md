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

### 📂 Portfolio Page
- Portfolio table supports symbol-prefix filtering and quote-based exact matching (`app/portfolio/page.tsx`)
- Toggle closed-position visibility and optional open-position symbol summarization
- Aggregated symbol rows preserve per-position edit/delete flows while showing grouped exposure

### 🔍 Search Page
- Comprehensive company analysis
- Detailed financial metrics and performance data
- Historical data visualization
- Header actions support watchlist add flows with user preference-aware defaults (`components/ui/CompanyHeader.tsx`)

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

### 4) Portfolio table filter + symbol summary behavior

Codepaths:

- Main page + table controls: `app/portfolio/page.tsx`
- Fully-closed classification helper: `isPositionFullyClosed` in `app/portfolio/page.tsx`

Behavior:

- Symbol filter is single-input, evaluated live from `symbolFilterInput`.
- Unquoted filter uses **prefix matching** (`startsWith`) on uppercased symbols.
  - Example: entering `MU` matches `MU` and `MSTRU`, but not `ALMU`.
- Quoted filter uses **exact match** when wrapped with matching quotes.
  - Example: `"MU"` or `'MU'` matches only `MU`.
- Closed-position visibility is controlled by `Show/Hide Closed`; this is applied after symbol filtering and sorting.
- `Summarize Symbols` enables only when filtered open positions contain duplicate symbols.
- Summary rows only group open positions; fully closed rows remain individual entries.

Operational constraints:

- Symbol filters are no longer persisted to localStorage (`financeguy-symbol-filters` is not used).
- Exact matching requires balanced quote delimiters (opening/closing quote must match).
- A position is treated as fully closed when any of these hold:
  - `priceTarget21Day > 0`
  - `remainingShares <= 0`
  - `closedDate` exists and either PT share field is populated (`priceTarget2RShares > 0` or `priceTarget5RShares > 0`)

### 5) Search page header watchlist workflow

Codepaths:

- Route + server prefetch: `app/search/[symbol]/page.tsx`
- Client handoff: `app/search/[symbol]/SearchPageClient.tsx`
- Header + watchlist control UI: `components/ui/CompanyHeader.tsx`
- Default watchlist preference source: `hooks/useUserPreferences.ts`

Workflow summary:

1. Search route prefetches quote + outlook server-side and passes them to the client card.
2. Company header renders price/actions and (if authenticated) the Add-to-Watchlist control.
3. Watchlist selector loads user watchlists ordered by `order_index`.
4. Selected watchlist precedence is:
   - current selected watchlist (if still valid),
   - `default_watchlist_id` from user preferences,
   - first available watchlist.
5. Add action inserts `{ watchlist_id, symbol }` into `watchlist_tickers`.
6. Duplicate adds are handled gracefully (pre-check + unique constraint error `23505`), and button state becomes `Added`.

Operational constraints:

- If user is not authenticated, the Add-to-Watchlist control is intentionally hidden.
- If no watchlists exist, header shows a `Create watchlist` link to `/watchlists`.
- Add button is disabled when loading, no watchlist is selected, or the symbol is already present.

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

### Portfolio symbol filter does not match expected rows

- Default behavior is prefix-only, not contains.
  - Example: `A` matches `AAPL`, but `PL` does not match `AAPL`.
- For exact symbol matching, wrap with balanced quotes (`"AAPL"` or `'AAPL'`).
- Clear accidental whitespace before/after symbols; filter input is trimmed before evaluation.

### "Summarize Symbols" button is disabled

- Summarization only enables when at least two **open** rows share the same symbol in the current filtered result set.
- If your duplicate symbols are fully closed (or hidden by current filters), the toggle remains disabled.

### Search page "Add" watchlist action is missing or disabled

- Control is hidden when signed out or while auth/preferences are still resolving.
- If you see `Create watchlist`, create at least one watchlist first at `/watchlists`.
- If button already reads `Added`, the selected watchlist already contains that symbol.

## 📝 License
This project is for educational purposes.

## 👨‍💻 Credits
Created by [jek030](https://github.com/jek030)