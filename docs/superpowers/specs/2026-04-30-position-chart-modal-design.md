# Position Chart Modal — Design

**Date:** 2026-04-30
**Status:** Implemented

## Goal

Let the user click a symbol on the `/portfolio` positions tab and immediately see a daily price chart of that symbol, with arrow markers showing where the buy (cost) and the exits occurred. Goal is to easily visualize where transactions sit on the price action of a single position.

## Current implementation notes

- Shipped component: `components/portfolio/PositionChartModal.tsx`.
- Mounted from `app/portfolio/page.tsx` with `position`, `isOpen`, `onClose`, and `portfolioValue` props.
- Uses hydrated `StockPosition` objects from `hooks/usePortfolio.ts`, not raw Supabase rows.
- Includes a 21 EMA, entry/stop/exit price lines, trade summary, and exits table in addition to the original bar chart and markers.
- Defers chart creation one animation frame after the Radix Dialog opens so lightweight-charts receives non-zero dimensions.

## Scope

- One modal, opened from the positions tab on `/portfolio`.
- Single position scope: the chart shows the buy + exits for the **specific position row clicked** (one row in `tblPortfolioPositions` plus its joined `tblPositionExits`).
- Daily timeframe only. Bar series, log scale, and a 21 EMA.

## Non-goals

- No volume pane, RSI, or additional indicators beyond the 21 EMA.
- No candlesticks (bar series only).
- No intraday/weekly/monthly timeframes.
- No company-name lookup in the title.
- No custom date pickers — only the four range presets below.
- No tooltip when hovering plain bars (markers only).
- No multi-position overlay for the same symbol.
- No persistence of last-used range preset.
- No automated tests (project has no test runner per CLAUDE.md).

## Architecture

### New file
- `components/portfolio/PositionChartModal.tsx` — the modal. Owns dialog shell, range selector, lightweight-charts setup, marker derivation, theme reactivity.

### Modified files
- `app/portfolio/page.tsx` — two edits in this single file:
  1. **Symbol cell** at the `case 'symbol':` branch (~line 3297). The non-summary path currently renders `position.symbol` as bare text; wrap it in a `<button>` when the symbol is a clickable stock. **Summary rows** (`isSummaryRow === true`, when `summarizeOpenPositions` is on) stay non-clickable — they aggregate multiple `trade_key`s and don't map to a single position.
  2. **Page state + modal mount** — add `selectedPosition` + `showChartModal` state and render `<PositionChartModal>` at the page level. Mirrors the existing `EditPositionModal` wiring already in this file (~lines 2473-2474).

### Dependencies
- None new. `lightweight-charts@5.0.1` is already installed; `useDailyPrices` hook + `/api/fmp/dailyprices` route already exist.

### Component shape
```ts
<PositionChartModal
  position={StockPosition | null}
  isOpen={boolean}
  onClose={() => void}
  portfolioValue={number}
/>
```

Internal hooks: `useDailyPrices({ symbol, from, to })`, `useTheme()` from `next-themes`, local `useState` for the active range preset, `useRef` + `useEffect` for the chart instance.

## Data flow

### Inputs (already on the position object passed in)
- `symbol`, `cost`, `quantity`, `open_date`, `type`
- `tblPositionExits[]` — `price`, `shares`, `exit_date` (nullable), `notes`

### Daily prices fetch
- `useDailyPrices({ symbol, from: fetchFrom, to })` — TanStack Query, 5m staleTime, 15m gcTime (existing defaults).
- `from`/`to` are the visible range derived from the active range preset (see UI Behavior); `fetchFrom` starts earlier to seed the 21 EMA. Cached per `[symbol, fetchFrom, to]`.

### Marker derivation
Pure helper inside the same file:
```ts
buildMarkers(position): SeriesMarker<Time>[]
```
- 1 buy marker: `{ time: open_date, position: 'belowBar', color: green, shape: 'arrowUp' }`.
- For each exit where `exit_date != null`: `{ time: exit_date, position: 'aboveBar', color: red, shape: 'arrowDown' }`.
- Exits with null `exit_date` are filtered out. If any are dropped, the chart caption renders `"N undated exit(s) not shown"`.

### Hover tooltip
Built with lightweight-charts' `subscribeCrosshairMove`. When the crosshair sits over a date that has a marker, a small floating div renders near the cursor:
- **Buy:** `BUY · {date} · {qty} shares @ ${cost}`
- **Sell:** `SELL · {date} · {shares} shares @ ${price} · {pnl$} ({pnl%})` — pnl computed against `position.cost`. For shorts (`position.type === 'Short'`), pnl sign flips (profit when exit price < cost).

No tooltip when hovering bars without a marker.

### Series setup
- `BarSeries` (lightweight-charts v5) — open/high/low/close from daily prices.
- `LineSeries` renders the 21 EMA after the seed window.
- Right price scale: `mode: PriceScaleMode.Logarithmic`.
- Theme: subscribe to `next-themes` `resolvedTheme`; rebuild chart options (background, grid, text colors) on change.

### Lifecycle
- Chart created in a `useEffect` keyed on modal open after one animation frame; disposed via `chart.remove()` on close.
- Data updates use `series.setData(...)` without recreating the chart.
- Markers attached via `createSeriesMarkers(series, markers)` (the v5 plugin API), updated when range or data changes.
- The page renders the modal with `key={chartPosition?.id ?? 'none'}` so reopening on a different position fully remounts; no stale state.

## UI behavior

### Modal
- `Dialog` from `@/components/ui/Dialog`, `max-w-[1100px]`, body height ~600px. Closes on outside click / ESC / X button.
- **Header (left):** `{symbol}` in monospace + small subtitle showing `Long`/`Short` and the open_date.
- **Header (right):** segmented buttons — `Trade · 3M · 6M · 1Y`. Default = `Trade`.
- **Body:** chart fills remaining space, followed by trade summary and exits tables.
- **Caption strip below chart:** left side shows `"N undated exit(s) not shown"` only if applicable; right side shows the FMP attribution.

### Range presets → from/to
- `Trade` — `from = open_date − 30 calendar days`, `to = (latest dated exit ?? today) + 30 calendar days`. Capped at today. Fetching starts 35 calendar days before `from` to seed the 21 EMA.
- `3M` / `6M` / `1Y` — `to = today`, `from = today − span`.

### Click guard on the symbol cell
In the symbol cell branch (`app/portfolio/page.tsx` ~line 3297):
```tsx
const isOption = position.symbol.includes(' ');
const isClickable = !isSummaryRow && !isOption;
isClickable
  ? <button onClick={() => openChart(position)}>{position.symbol}</button>
  : <span>{position.symbol}</span>
```
Clickable tickers get hover underline / pointer cursor; options and summary rows stay plain.

### Loading / error / empty states
- **Loading:** skeleton block in the chart area.
- **Error** (FMP fetch failed): centered message `"Could not load price data for {symbol}."` + Retry button (TanStack Query `refetch`).
- **Empty** (FMP returns 0 bars): centered message `"No price history available for {symbol}."`.

## Edge cases

- **Symbol is an option** (`symbol.includes(' ')`) → cell not clickable.
- **Summary row** (multiple positions for the same symbol aggregated when `summarizeOpenPositions` is on) → cell not clickable.
- **All exits have null `exit_date`** → only buy marker rendered; "N undated exit(s) not shown" caption appears.
- **Position is fully closed** → `Trade` range uses last dated exit + 30d as `to`.
- **Position is open (no exits)** → only buy marker; `Trade` range uses today as `to`.
- **Trade older than the FMP history window** → chart renders whatever bars FMP returns; markers outside that range simply don't appear.
- **Theme change while modal is open** → chart options rebuilt from `resolvedTheme`.
- **Modal reopened on a different position** → `key={chartPosition?.id ?? 'none'}` forces full remount.
- **Short positions** → buy marker still below bar (entry is entry); tooltip P&L flipped.

## Manual verification

1. Click a stock symbol on a closed position → modal opens with bar chart, log scale, buy + exit markers.
2. Hover markers → tooltip shows correct numbers; sells show P&L vs cost.
3. Range buttons swap data (verify network calls in devtools).
4. Click an option symbol (e.g., `MU 04/17/2026 470.00 C`) → no click handler, no cursor change.
5. Close modal, reopen on different symbol → chart shows new symbol's data, no flash of old data.
6. Toggle theme → chart colors update.
