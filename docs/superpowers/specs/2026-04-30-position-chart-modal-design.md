# Position Chart Modal — Design

**Date:** 2026-04-30
**Status:** Implemented

## Goal

Let the user click a stock symbol on the `/portfolio` positions tab and inspect the price action for that single position. The modal should show where the entry, stop, and filled exits sit on the chart, plus the derived trade summary needed to review the position without leaving the table.

## Scope

- One modal, opened from the positions tab on `/portfolio`.
- Single position scope: the chart and tables are for the specific `StockPosition` row clicked.
- Daily timeframe only, with range presets: `Trade`, `3M`, `6M`, `1Y`.
- Daily bar chart on a logarithmic price scale, plus a 21 EMA line.
- Buy and dated-exit markers; dashed price lines for entry, initial stop, and dated exit prices.
- Trade summary and exits tables inside the modal.

## Non-goals

- No volume pane, RSI, MACD, or additional indicators beyond the implemented 21 EMA.
- No candlesticks; the chart uses `BarSeries`.
- No intraday/weekly/monthly timeframes.
- No custom date pickers; only the four range presets above.
- No tooltip when hovering plain bars without a marker date.
- No multi-position overlay for the same symbol.
- No persistence of last-used range preset.
- No automated tests; the project has no test runner per `CLAUDE.md`.

## Architecture

### Files

- `components/portfolio/PositionChartModal.tsx`
  - Dialog shell, range selector, lightweight-charts lifecycle, marker/tooltip derivation, 21 EMA, price lines, trade summary, exits table, theme reactivity.
- `app/portfolio/page.tsx`
  - Holds `chartPosition` / `showChartModal` state.
  - Wraps clickable non-summary stock symbols in a button.
  - Mounts `<PositionChartModal>` near the existing `EditPositionModal`.
- `hooks/FMP/useDailyPrices.ts`
  - TanStack Query wrapper for `/api/fmp/dailyprices`.
- `app/api/fmp/dailyprices/route.ts`
  - Server-side FMP proxy. Validates `symbol`, `from`, and `to`; requires `FMP_API_KEY`.
- `utils/portfolioCalculations.ts`
  - Shared derived values for realized gain, remaining shares, and R multiple.

### Dependencies

- No feature-specific dependency was added for the final modal. It uses existing `lightweight-charts@5.0.1`, `next-themes`, TanStack Query, `date-fns`, and shadcn/Radix Dialog primitives.

### Component shape

```tsx
<PositionChartModal
  key={chartPosition?.id ?? 'none'}
  position={chartPosition}
  isOpen={showChartModal}
  portfolioValue={portfolioValueNumber}
  onClose={() => {
    setShowChartModal(false);
    setChartPosition(null);
  }}
/>
```

Internal hooks: `useDailyPrices({ symbol, from, to })`, `useTheme()`, local state for active range preset and tooltip, and refs for chart, bar series, EMA series, markers, and price lines.

## Data flow

### Inputs

The modal receives the camelCase `StockPosition` shape from `hooks/usePortfolio.ts`, not the raw Supabase row:

- Position fields: `id`, `symbol`, `cost`, `quantity`, `netCost`, `initialStopLoss`, `type`, `openDate`, `closedDate`
- Exit rows: `exits[]` with `price`, `shares`, `exitDate`, `notes`, `sortOrder`
- Portfolio value: `portfolioValue`, used only for `% portfolio gain` in the summary table

### Daily prices fetch

- `deriveRange(position, preset)` returns:
  - `from`: visible-window start
  - `to`: visible-window end
  - `fetchFrom`: `from - 35 calendar days`
- `useDailyPrices` is called with `from: range.fetchFrom` and `to: range.to`.
- Query key: `['daily-prices', symbol, from, to]`.
- Cache policy: 5-minute `staleTime`, 15-minute `gcTime`.
- The API route proxies to FMP `/v3/historical-price-full/{symbol}` and validates `YYYY-MM-DD` dates.
- FMP historical data is returned newest-first; `toBarData` reverses it before passing to lightweight-charts.

The 35-day fetch lookback seeds the 21 EMA before the visible range starts. After data is set, the chart calls `setVisibleRange({ from: range.from, to: range.to })`.

### Range presets

- `Trade`: `from = openDate - 30d`; `to = (latest dated exit ?? today) + 30d`, capped at today.
- `3M`, `6M`, `1Y`: `to = today`; `from = today - span`.

### Chart setup

- `BarSeries` for OHLC bars.
- `LineSeries` for the 21 EMA.
- Right price scale uses `PriceScaleMode.Logarithmic`.
- Crosshair uses `CrosshairMode.Normal`.
- Chart creation is deferred with `requestAnimationFrame` after the Dialog opens so the container has real dimensions.
- Theme changes call `chart.applyOptions(...)` and update EMA color without recreating the chart.
- Cleanup removes the chart, clears refs, and resets `chartReady`.

### Markers, price lines, and tooltip

- `buildMarkers(position, markerColor)` creates:
  - one entry marker at `openDate`, below the bar
  - one exit marker per dated exit, above the bar
  - no marker for planned/undated exits
- Markers are sorted ascending because lightweight-charts requires chronological order.
- Marker color is black in light mode and gray in dark mode.
- Dashed price lines are rebuilt with each data/position update:
  - entry: green
  - initial stop: yellow, when `initialStopLoss > 0`
  - dated exits: red
  - duplicates are skipped by `(kind, price)`
- Tooltip data is keyed by chart date:
  - Buy: `BUY · {date} · {shares} shares @ ${cost}`
  - Sell: `SELL · {date} · {shares} shares @ ${weightedExitPrice} · {pnl$} ({pnl%})`
  - Same-date exits are aggregated into total shares, weighted-average exit price, and total P&L.
  - Short positions flip P&L so an exit below cost is positive.
- The tooltip is horizontally clamped to the chart container to avoid edge clipping.

### Trade summary and exits tables

- `TradeSummary` renders symbol, cost, stop loss, R, gain/loss, portfolio gain, net cost, initial shares, remaining shares, and days in trade.
- `ExitsSection` sorts dated exits first by date, then planned exits by `sortOrder`.
- Exit rows show price, shares, date, gain dollars, gain percent, and notes.
- Derived values intentionally reuse `utils/portfolioCalculations.ts` helpers where available.

## UI behavior

### Modal

- `Dialog` from `@/components/ui/Dialog`.
- `DialogContent`: `max-w-[1100px]`, `max-h-[90vh]`, vertical scroll for the chart plus tables.
- Header left: monospace `{symbol}` plus `{Long|Short} · opened {date}`.
- Header right: range buttons `Trade · 3M · 6M · 1Y`; default is `Trade`.
- Chart area height: `600px`.
- The chart body shows loading, error, and empty states over the chart container.

### Click guard on the symbol cell

In `app/portfolio/page.tsx`, the symbol cell keeps summary rows and options non-clickable:

```tsx
const isOption = position.symbol.includes(' ');
const symbolNode = isOption ? (
  <span>{position.symbol}</span>
) : (
  <button
    type="button"
    onClick={() => {
      setChartPosition(position);
      setShowChartModal(true);
    }}
  >
    {position.symbol}
  </button>
);
```

Summary rows render `row.symbol` plus a `Summary` label. They do not open the modal because a summary row can aggregate multiple position IDs.

### Loading / error / empty states

- Loading: full-area skeleton block.
- Error: `"Could not load price data for {symbol}."` plus a Retry button (`refetch`).
- Empty: `"No price history available for {symbol}."`.

## Edge cases

- **Option symbol** (`symbol.includes(' ')`) -> not clickable.
- **Summary row** (`summarizeOpenPositions` aggregate) -> not clickable.
- **Undated/planned exits** -> excluded from markers and dated-exit price lines; still shown in the exits table.
- **Position is fully closed** -> `Trade` range uses last dated exit + 30d as `to`, capped at today.
- **Position is open or has no dated exits** -> `Trade` range uses today as `to`.
- **Trade older than the FMP history window** -> chart renders whatever bars FMP returns; markers outside returned bars do not appear.
- **Data loads before deferred chart creation finishes** -> `chartReady` triggers the data push once refs exist.
- **Theme change while modal is open** -> chart and EMA colors update through `applyOptions`.
- **Modal reopened on a different position** -> page-level `key={chartPosition?.id ?? 'none'}` forces a remount.
- **Short positions** -> entry marker remains below bar; sell tooltip and exits table P&L flip sign correctly.

## Manual verification

1. Click a stock symbol on a closed position -> modal opens with daily bar chart, log scale, 21 EMA, entry/exit markers, and price lines.
2. Hover marker dates -> tooltip shows correct buy/sell values; same-date exits aggregate; shorts show positive P&L when exit price is below cost.
3. Change `Trade`, `3M`, `6M`, and `1Y` -> data fetches by range and visible window updates.
4. Click an option symbol such as `MU 04/17/2026 470.00 C` -> no modal and no pointer affordance.
5. Toggle summarized open positions -> summary symbols stay non-clickable.
6. Close and reopen on a different symbol -> chart and tables show only the new position.
7. Toggle theme while the modal is open -> chart colors and EMA update.
8. Open positions with planned/undated exits -> planned exits appear in the table but not as chart markers.
