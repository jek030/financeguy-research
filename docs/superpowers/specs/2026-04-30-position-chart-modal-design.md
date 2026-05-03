# Position Chart Modal — Design

**Date:** 2026-04-30
**Status:** Implemented

## Goal

Let the user click a symbol on the `/portfolio` positions tab and immediately see a daily price chart of that symbol, with markers and price lines showing where the buy (cost) and exits occurred. Goal is to easily visualize where transactions sit on the price action of a single position.

## Scope

- One modal, opened from the positions tab on `/portfolio`.
- Single position scope: the chart shows the buy + exits for the **specific position row clicked** (one row in `tblPortfolioPositions` plus its joined `tblPositionExits`).
- Daily timeframe only. Bar series, log scale, 21 EMA overlay.

## Non-goals

- No volume pane, RSI, or additional indicators beyond the implemented 21 EMA.
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
- `components/portfolio/PositionChartModal.tsx` — the modal. Owns dialog shell, range selector, lightweight-charts setup, marker/price-line derivation, 21 EMA derivation, trade summary/exits tables, tooltip behavior, and theme reactivity.

### Modified files
- `app/portfolio/page.tsx` — two edits in this single file:
  1. **Symbol cell** at the `case 'symbol':` branch. The non-summary path renders `position.symbol` as a `<button>` when the symbol is a clickable stock. **Summary rows** (`isSummaryRow === true`, when `summarizeOpenPositions` is on) stay non-clickable because they aggregate multiple positions.
  2. **Page state + modal mount** — `chartPosition` + `showChartModal` state and a page-level `<PositionChartModal>` mount near the existing `EditPositionModal`.

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

Internal hooks: `useDailyPrices({ symbol, from, to })`, `useTheme()` from `next-themes`, local `useState` for the active range preset and tooltip, `useRef` + `useEffect` for the chart instance.

## Data flow

### Inputs (already on the `StockPosition` passed in)
- `symbol`, `cost`, `quantity`, `netCost`, `initialStopLoss`, `openDate`, `closedDate`, `type`
- `exits[]` — `price`, `shares`, `exitDate` (nullable), `notes`, `sortOrder`
- `portfolioValue` — used to display the position's realized gain as a percentage of the selected portfolio.

### Daily prices fetch
- `useDailyPrices({ symbol, from, to })` — TanStack Query, 5m staleTime, 15m gcTime (existing defaults).
- Visible `from`/`to` are derived from the active range preset (see UI Behavior).
- Fetch `from` is pulled back 35 calendar days before the visible window to seed the 21 EMA.
- Query cache key is `[daily-prices, symbol, fetchFrom, to]`.

### Marker and price-line derivation
Pure helper inside the same file:
```ts
buildMarkers(position, markerColor): SeriesMarker<Time>[]
```
- 1 buy marker: `{ time: openDate, position: 'belowBar', shape: 'arrowUp' }`.
- For each exit where `exitDate != null`: `{ time: exitDate, position: 'aboveBar', shape: 'arrowDown' }`.
- Marker color follows theme (`#000000` in light mode, `#9CA3AF` in dark mode).
- Exits with null `exitDate` are filtered out.
- Horizontal dashed price lines are added for the entry cost and each dated exit price. Lines are deduped by `(kind, price)` so same-price exits do not stack.

### Hover tooltip
Built with lightweight-charts' `subscribeCrosshairMove`. When the crosshair sits over a date that has a marker, a small floating div renders near the cursor:
- **Buy:** `BUY · {date} · {qty} shares @ ${cost}`
- **Sell:** `SELL · {date} · {shares} shares @ ${price} · {pnl$} ({pnl%})` — pnl computed against `position.cost`. For shorts (`position.type === 'Short'`), pnl sign flips (profit when exit price < cost).
- Same-date partial exits aggregate into one sell tooltip with summed shares, summed dollar P&L, and weighted-average exit price.

No tooltip when hovering bars without a marker.

### Series setup
- `BarSeries` (lightweight-charts v5) — open/high/low/close from daily prices.
- `LineSeries` — 21 EMA calculated locally from fetched closes. The line starts after the first 21 bars.
- Right price scale: `mode: PriceScaleMode.Logarithmic`.
- Theme: subscribe to `next-themes` `resolvedTheme`; rebuild chart options (background, grid, text colors) on change.

### Lifecycle
- Chart creation is deferred by one animation frame after open so the Radix Dialog container has dimensions before lightweight-charts reads it; disposed via `chart.remove()` on close.
- Data updates use `series.setData(...)` without recreating the chart.
- Markers attached via `createSeriesMarkers(series, markers)` (the v5 plugin API), updated when range or data changes.
- The modal mount uses `key={chartPosition?.id ?? 'none'}` so reopening on a different position fully remounts; no stale state.

## UI behavior

### Modal
- `Dialog` from `@/components/ui/Dialog`, `max-w-[1100px]`, body height ~600px. Closes on outside click / ESC / X button.
- **Header (left):** `{symbol}` in monospace + small subtitle showing `Long`/`Short` and the open_date.
- **Header (right):** segmented buttons — `Trade · 3M · 6M · 1Y`. Default = `Trade`.
- **Body:** chart fills remaining space.
- **Below chart:** trade summary table, then exits table sorted by dated exits first and undated exits by `sortOrder`.

### Range presets → visible from/to
- `Trade` — `from = open_date − 30 calendar days`, `to = (latest dated exit ?? today) + 30 calendar days`. Capped at today.
- `3M` / `6M` / `1Y` — `to = today`, `from = today − span`.
- Fetch `from` is `visible from − 35 calendar days` for the EMA warmup.

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
- **All exits have null `exitDate`** → only buy marker rendered; undated rows still appear in the exits table.
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
