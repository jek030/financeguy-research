# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Commands

```bash
npm run dev       # Start dev server with Turbopack (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint 9 with Next.js rules
```

No test runner is configured. There is an optional backend in `/server` with its own `package.json` that uses Prisma.

## Architecture

**Finance Guy Research Tool** is a Next.js 15 App Router application for financial research and portfolio management. It uses React 19, TypeScript, Tailwind CSS, and shadcn/ui components.

### Data Sources & API Layer

All external API calls are proxied through Next.js API routes — client components never call FMP or CNN directly.

- **FMP (Financial Modeling Prep)** — 26+ proxy routes under `app/api/fmp/`, configured via `app/api/fmp/config.ts`. Key env var: `FMP_API_KEY`.
- **Supabase** — PostgreSQL backend for auth, portfolios, watchlists, preferences, and NAAIM sentiment data. Client: `lib/supabase.ts`. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **CNN Fear & Greed** — proxied through `app/api/market/fear-greed/`, cached 5 minutes.
- **NAAIM Exposure** — synced weekly via GitHub Actions (`naaim-job.yml`) using `scripts/sync_naaim_to_supabase.py`.

### Key Hooks & Utilities

- `hooks/FMP/` — TanStack Query hooks wrapping FMP proxy routes (e.g., `useQuote`, `useProfile`)
- `hooks/usePortfolio.ts` — full portfolio CRUD against Supabase
- `hooks/useWatchlist.ts` — watchlist CRUD against Supabase
- `hooks/useUserPreferences.ts` — persists user settings (default watchlist, portfolio, table column config)
- `utils/portfolioCalculations.ts` — R-target math (2R/5R price targets from entry vs. stop loss)
- `utils/transactionCalculations.ts` — brokerage JSON parsing → action/symbol summaries
- `lib/formatters.ts` — shared number/date/currency formatters

### Supabase Schema (key tables)

| Table | Purpose |
|---|---|
| `portfolio` | User portfolios (portfolio_key, user_id, name, value) |
| `portfolio_position` | Positions with R-targets, open risk, realized gains |
| `watchlist` | Named watchlists per user |
| `ticker` | Symbols within a watchlist |
| `market_sentiment_naaim` | Weekly NAAIM exposure (week_ending, mean, quartiles) |
| `user_preferences` | Default watchlist/portfolio, table column settings |

### Portfolio & R-Target System

Positions store `initial_stop_loss`, `cost` (entry price), and `quantity`. R-targets are calculated as multiples of the entry-to-stop distance. `price_target_1/2/3` and `price_target_1/2_quantity` track partial exits. `realized_gain` accumulates from trims + final exit. `open_risk` is stored as a percentage.

### Transaction Import Flow

Brokerage JSON → `localStorage` (`transactions-data` key) → parsed by `utils/transactionCalculations.ts` → displayed in `app/transactions/` → eligible trades pushed to portfolio via Supabase.

### Page Routes

| Route | Purpose |
|---|---|
| `/` | Home dashboard (Fear & Greed, NAAIM, sector returns, quotes) |
| `/search/[symbol]` | Company detail (profile, metrics, charts, insider trades, news) |
| `/portfolio` | Portfolio manager — requires auth |
| `/watchlists` | Watchlist editor — requires auth |
| `/transactions` | Brokerage JSON importer |
| `/calendar` | Earnings calendar |
| `/scans` | Sector/market scans with drill-down |
| `/crypto` | Crypto prices |
| `/realized-gains` | Realized gains analysis |

### State Management Pattern

- **Server state:** TanStack React Query (all FMP + Supabase reads)
- **Form state:** React Hook Form + Zod
- **Auth:** Supabase Auth via `lib/context/auth-context.tsx`
- **Drag-and-drop ordering:** DnD Kit (watchlists, positions)
- **Toasts:** Sonner

### Automation

GitHub Actions in `.github/workflows/` run three scheduled jobs:
- `naaim-job.yml` — Wednesdays 23:30 UTC, runs `scripts/sync_naaim_to_supabase.py`
- `earnings-job.yml` — earnings calendar sync
- `sectors-job.yml` — sector data sync

Required GitHub secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NAAIM_SOURCE_URL`.
