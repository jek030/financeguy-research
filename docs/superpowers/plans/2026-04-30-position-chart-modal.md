# Position Chart Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click a symbol on `/portfolio` positions tab → modal opens with a daily bar chart (log scale) of that symbol, with arrow markers at the buy and at each dated exit.

**Architecture:** One self-contained `PositionChartModal` colocated with other portfolio modals; state lives at the page level mirroring `EditPositionModal`'s wiring. The chart uses `lightweight-charts` v5 with `BarSeries`, `createSeriesMarkers`, and `subscribeCrosshairMove` for hover tooltips. Daily prices come from the existing `/api/fmp/dailyprices` route via the existing `useDailyPrices` hook.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui Dialog, `lightweight-charts@5.0.1`, `next-themes`, TanStack Query, date-fns.

**Testing:** No automated tests — the project has no test runner configured (per CLAUDE.md). Each task ends with **manual verification** steps that the engineer must run in `npm run dev` before committing.

**Spec:** `docs/superpowers/specs/2026-04-30-position-chart-modal-design.md`

**Important domain types** (from `hooks/usePortfolio.ts`):

```ts
export interface PositionExit {
  id: string;
  positionId: string;
  price: number;
  shares: number;
  exitDate: Date | null;
  notes: string | null;
  sortOrder: number;
}

export interface StockPosition {
  id: string;
  symbol: string;
  cost: number;
  quantity: number;
  netCost: number;
  initialStopLoss: number;
  stopLoss: number;
  type: 'Long' | 'Short';
  openDate: Date;
  closedDate: Date | null;
  exits: PositionExit[];
  realizedGain: number;
  currentPrice?: number;
}
```

The positions table works with `StockPosition` (camelCase domain type), **not** the raw `SupabasePortfolioPosition` shape from the spec — use `StockPosition` throughout the modal.

---

## File map

- **Create** `components/portfolio/PositionChartModal.tsx` — the entire modal: dialog shell, range selector, lightweight-charts setup, marker derivation, tooltip, theme reactivity. ~250-300 lines.
- **Modify** `app/portfolio/page.tsx`:
  - State + `<PositionChartModal>` mount near the existing `<EditPositionModal>` (~line 3792).
  - Symbol cell at the `case 'symbol':` branch (~line 3296) — make non-summary, non-option symbols clickable.

---

## Task 1: Modal skeleton + page wiring (no chart yet)

Goal: Modal opens/closes correctly when triggered. No chart logic yet — just the dialog shell, header, and a placeholder body so we can verify wiring before adding chart complexity.

**Files:**
- Create: `components/portfolio/PositionChartModal.tsx`
- Modify: `app/portfolio/page.tsx`

- [ ] **Step 1: Create the skeleton modal file**

Create `components/portfolio/PositionChartModal.tsx`:

```tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import { format } from 'date-fns';

export interface PositionChartModalProps {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
}: PositionChartModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0">
        {position && (
          <div key={position.id} className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'yyyy-MM-dd')}
                </p>
              </div>
              {/* Range selector goes here in Task 3 */}
            </DialogHeader>
            <div className="px-5 py-4">
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground">
                Chart placeholder for {position.symbol}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire state + mount in `app/portfolio/page.tsx`**

Open `app/portfolio/page.tsx`. At the top, add the import next to the existing `EditPositionModal` import (~line 41):

```tsx
import { EditPositionModal } from '@/components/portfolio/EditPositionModal';
import { PositionChartModal } from '@/components/portfolio/PositionChartModal';
```

Find the existing edit-modal state (~line 2473):

```tsx
const [editingPosition, setEditingPosition] = useState<StockPosition | null>(null);
const [showEditModal, setShowEditModal] = useState(false);
```

Add directly below it:

```tsx
const [chartPosition, setChartPosition] = useState<StockPosition | null>(null);
const [showChartModal, setShowChartModal] = useState(false);
```

Find the existing `<EditPositionModal ... />` mount (~line 3792). Insert the chart modal directly after the closing `/>`:

```tsx
<PositionChartModal
  position={chartPosition}
  isOpen={showChartModal}
  onClose={() => {
    setShowChartModal(false);
    setChartPosition(null);
  }}
/>
```

- [ ] **Step 3: Add a temporary debug trigger to verify wiring**

Just for this task — we'll remove it in Task 2 once the real symbol-cell trigger is in. In `app/portfolio/page.tsx`, find the symbol cell branch (~line 3306, the line that reads `position.symbol`) and temporarily replace it with:

```tsx
<button
  type="button"
  onClick={() => {
    setChartPosition(position);
    setShowChartModal(true);
  }}
  className="underline"
>
  {position.symbol}
</button>
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Navigate to `/portfolio`. Click any non-summary symbol in the positions table.

Expected:
- Modal opens, displays the symbol in monospace, the type (Long/Short), and the open date in `yyyy-MM-dd` format.
- Body shows "Chart placeholder for {symbol}" centered in a 600px-tall area.
- Pressing ESC closes it. Clicking outside closes it. Clicking the X closes it.
- Reopening on a different symbol shows the new symbol (not the previous one — the `key={position.id}` forces remount).

- [ ] **Step 5: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx app/portfolio/page.tsx
git commit -m "feat(portfolio): add PositionChartModal skeleton with page wiring"
```

---

## Task 2: Real symbol cell click + option/summary guards

Goal: Replace the temporary debug trigger with the production version that handles options (skip) and summary rows (skip).

**Files:**
- Modify: `app/portfolio/page.tsx`

- [ ] **Step 1: Replace the symbol cell with the guarded version**

In `app/portfolio/page.tsx`, find the `case 'symbol':` branch (~line 3296) which currently looks like:

```tsx
case 'symbol':
  return (
    <TableCell key={col.id} className={baseCellClass}>
      {isSummaryRow ? (
        <span className="inline-flex items-center gap-2">
          <span>{row.symbol}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Summary</span>
        </span>
      ) : (
        // The temporary <button> from Task 1 is here
      )}
    </TableCell>
  );
```

Replace the **non-summary** branch (the `position.symbol` / temporary button) so the whole `case 'symbol':` looks like this:

```tsx
case 'symbol': {
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
      className="text-left hover:underline focus:outline-none focus:underline cursor-pointer"
    >
      {position.symbol}
    </button>
  );

  return (
    <TableCell key={col.id} className={baseCellClass}>
      {isSummaryRow ? (
        <span className="inline-flex items-center gap-2">
          <span>{row.symbol}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Summary</span>
        </span>
      ) : (
        symbolNode
      )}
    </TableCell>
  );
}
```

(The `{ }` block braces around the `case` body are required because we declare `const`s.)

- [ ] **Step 2: Manual verification**

Run `npm run dev`, navigate to `/portfolio`.

- Click a regular stock ticker (e.g., `AAPL`) → modal opens. Hover shows underline + pointer cursor. ✅
- Click an option symbol containing a space (e.g., `MU 04/17/2026 470.00 C`) → no modal, no cursor change, plain text. ✅
- Toggle "Summarize Open Positions" on → click an aggregated row's symbol → no modal, plain text with "Summary" label. ✅

- [ ] **Step 3: Commit**

```bash
git add app/portfolio/page.tsx
git commit -m "feat(portfolio): make positions-tab symbol cell open chart modal"
```

---

## Task 3: Range preset selector + from/to derivation

Goal: Add the four-button range selector (`Trade · 3M · 6M · 1Y`) to the modal header and derive `from`/`to` strings (YYYY-MM-DD) for the chart fetch. No fetch yet — just state + a debug display.

**Files:**
- Modify: `components/portfolio/PositionChartModal.tsx`

- [ ] **Step 1: Add range preset state + derivation**

Replace the entire contents of `components/portfolio/PositionChartModal.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import type { StockPosition } from '@/hooks/usePortfolio';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PositionChartModalProps {
  position: StockPosition | null;
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 'Trade' | '3M' | '6M' | '1Y';

const RANGE_PRESETS: RangePreset[] = ['Trade', '3M', '6M', '1Y'];

function formatDateForFmp(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function clampToToday(d: Date): Date {
  const today = new Date();
  return d > today ? today : d;
}

function deriveRange(position: StockPosition, preset: RangePreset): {
  from: string;
  to: string;
} {
  const today = new Date();

  if (preset === 'Trade') {
    const datedExits = position.exits.filter((e) => e.exitDate !== null);
    const lastExit = datedExits.length
      ? datedExits.reduce((max, e) =>
          (e.exitDate as Date) > max ? (e.exitDate as Date) : max,
          datedExits[0].exitDate as Date
        )
      : null;
    const from = subDays(position.openDate, 30);
    const to = clampToToday(subDays(new Date((lastExit ?? today).getTime()), -30));
    return { from: formatDateForFmp(from), to: formatDateForFmp(to) };
  }

  const spanMap: Record<Exclude<RangePreset, 'Trade'>, Date> = {
    '3M': subMonths(today, 3),
    '6M': subMonths(today, 6),
    '1Y': subYears(today, 1),
  };
  return {
    from: formatDateForFmp(spanMap[preset]),
    to: formatDateForFmp(today),
  };
}

export function PositionChartModal({
  position,
  isOpen,
  onClose,
}: PositionChartModalProps) {
  const [preset, setPreset] = useState<RangePreset>('Trade');

  const range = useMemo(
    () => (position ? deriveRange(position, preset) : null),
    [position, preset]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1100px] p-0 gap-0">
        {position && (
          <div key={position.id} className="flex flex-col">
            <DialogHeader className="flex flex-row items-center justify-between px-5 py-3 border-b">
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="font-mono text-base">
                  {position.symbol}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {position.type} · opened {format(position.openDate, 'yyyy-MM-dd')}
                </p>
              </div>
              <div className="flex gap-1">
                {RANGE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreset(p)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-mono rounded border',
                      preset === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </DialogHeader>
            <div className="px-5 py-4">
              <div className="h-[600px] flex items-center justify-center text-sm text-muted-foreground">
                {range && `Range: ${range.from} → ${range.to}`}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Note the `subDays(date, -30)` trick adds 30 days; alternatively use `addDays`. Either works — the file already imports what's needed.

Alternative cleaner version: replace `subDays(new Date((lastExit ?? today).getTime()), -30)` with `addDays(lastExit ?? today, 30)` and add `addDays` to the import. Use whichever the engineer prefers; both produce identical results.

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Open the modal on any position.

- Header right side shows four buttons: `Trade · 3M · 6M · 1Y`. `Trade` is selected by default (filled).
- Body shows the derived `from → to` text.
- Click each button: highlighted state moves; the displayed range updates.
  - For `Trade` on a closed position: from ≈ open_date − 30d, to ≈ last_exit_date + 30d (clamped to today).
  - For `Trade` on an open position: to ≈ today + 30d (clamped to today).
  - For `3M`: from = today − 3 months, to = today.
  - For `6M`/`1Y`: similarly.

- [ ] **Step 3: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx
git commit -m "feat(portfolio): add range preset selector to chart modal"
```

---

## Task 4: Lightweight-charts BarSeries with daily prices fetch

Goal: Replace the placeholder body with an actual `BarSeries` chart on log scale, fed by `useDailyPrices`. Handle loading/error/empty states. No markers or tooltip yet.

**Files:**
- Modify: `components/portfolio/PositionChartModal.tsx`

**Important — FMP returns historical data in reverse-chronological order**; `lightweight-charts` requires ascending order by time. Reverse before passing to `setData`.

- [ ] **Step 1: Add the fetch + chart rendering**

In `components/portfolio/PositionChartModal.tsx`, add these imports at the top (alongside existing imports):

```tsx
import { useEffect, useRef } from 'react';
import {
  createChart,
  BarSeries,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';
import { useTheme } from 'next-themes';
import { useDailyPrices, type DailyPriceData } from '@/hooks/FMP/useDailyPrices';
```

Add a helper outside the component (near `deriveRange`):

```tsx
function toBarData(historical: DailyPriceData[]): {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}[] {
  // FMP returns newest-first; lightweight-charts needs ascending time.
  return [...historical]
    .reverse()
    .map((d) => ({
      time: d.date as Time, // YYYY-MM-DD strings are valid BusinessDay-equivalent Time values
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
}
```

Inside the component, **replace** the placeholder `<div className="px-5 py-4">...</div>` with the chart container + states. The full updated component body (after the existing `range = useMemo(...)` line) becomes:

```tsx
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Bar'> | null>(null);

  const { data: historical, isLoading, isError, refetch } = useDailyPrices({
    symbol: position?.symbol ?? '',
    from: range?.from ?? '',
    to: range?.to ?? '',
    enabled: isOpen && !!position && !!range,
  });

  // Create / destroy chart on modal open/close
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const isLight = resolvedTheme === 'light';
    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: isLight ? '#FFFFFF' : '#0F0F0F' },
        textColor: isLight ? '#0F172A' : '#F2F2F2',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
        horzLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
      },
      rightPriceScale: { mode: PriceScaleMode.Logarithmic, borderVisible: false },
      timeScale: { borderVisible: false },
    });
    const series = chart.addSeries(BarSeries, {
      upColor: isLight ? '#16A34A' : '#22C55E',
      downColor: isLight ? '#DC2626' : '#EF4444',
      thinBars: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // We deliberately recreate the chart only on open toggle; theme handled in Task 7.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Push data into the series when it arrives or range changes
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !historical || historical.length === 0) return;
    series.setData(toBarData(historical));
    chartRef.current?.timeScale().fitContent();
  }, [historical]);
```

Then **replace** the body `<div className="px-5 py-4">...</div>` with:

```tsx
<div className="px-5 py-4">
  <div className="relative h-[600px] w-full">
    <div ref={containerRef} className="absolute inset-0" />
    {isLoading && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-full w-full animate-pulse bg-muted/30 rounded" />
      </div>
    )}
    {isError && !isLoading && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm">
        <p>Could not load price data for {position.symbol}.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1 text-xs border rounded hover:bg-muted"
        >
          Retry
        </button>
      </div>
    )}
    {!isLoading && !isError && historical && historical.length === 0 && (
      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
        No price history available for {position.symbol}.
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Open the modal on a recent stock position.

- Loading state shows briefly, then the chart renders bar candles (no markers yet).
- Right-side price axis is logarithmic (gridlines compress at higher prices).
- Switch the range preset → chart re-fetches and re-renders with new data; `fitContent` zooms to fit.
- Test error path: temporarily break the FMP call (e.g., misspell the symbol) → "Could not load price data for {symbol}." with Retry button. Restore.
- Test empty path: pick a symbol/range that returns 0 bars (e.g., a delisted ticker) → "No price history available."

- [ ] **Step 3: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx
git commit -m "feat(portfolio): render BarSeries log-scale chart in PositionChartModal"
```

---

## Task 5: Buy + dated-exit markers with undated-exit caption

Goal: Overlay an up-arrow marker at the buy and a down-arrow marker at each dated exit. Render a small caption under the chart if any exits had `exitDate === null` and were dropped.

**Files:**
- Modify: `components/portfolio/PositionChartModal.tsx`

- [ ] **Step 1: Add marker imports + helper**

Add `createSeriesMarkers` and `SeriesMarker` to the lightweight-charts import:

```tsx
import {
  createChart,
  BarSeries,
  PriceScaleMode,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts';
```

Add a helper outside the component (near `toBarData`):

```tsx
function buildMarkers(position: StockPosition): {
  markers: SeriesMarker<Time>[];
  undatedExitCount: number;
} {
  const markers: SeriesMarker<Time>[] = [
    {
      time: format(position.openDate, 'yyyy-MM-dd') as Time,
      position: 'belowBar',
      color: '#22C55E',
      shape: 'arrowUp',
      text: '',
    },
  ];

  let undated = 0;
  for (const exit of position.exits) {
    if (!exit.exitDate) {
      undated += 1;
      continue;
    }
    markers.push({
      time: format(exit.exitDate, 'yyyy-MM-dd') as Time,
      position: 'aboveBar',
      color: '#EF4444',
      shape: 'arrowDown',
      text: '',
    });
  }

  // lightweight-charts requires markers sorted ascending by time.
  markers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return { markers, undatedExitCount: undated };
}
```

- [ ] **Step 2: Add a markers ref and wire them into the chart**

Add a new ref alongside the existing chart refs:

```tsx
const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
```

Compute markers + undated count via `useMemo`:

```tsx
const { markers, undatedExitCount } = useMemo(
  () => (position ? buildMarkers(position) : { markers: [], undatedExitCount: 0 }),
  [position]
);
```

In the existing data-loading `useEffect` (the one keyed on `[historical]`), **after** the `series.setData(...)` call and **before** `fitContent()`, attach or update the markers:

```tsx
useEffect(() => {
  const series = seriesRef.current;
  if (!series || !historical || historical.length === 0) return;
  series.setData(toBarData(historical));

  if (!markersRef.current) {
    markersRef.current = createSeriesMarkers(series, markers);
  } else {
    markersRef.current.setMarkers(markers);
  }

  chartRef.current?.timeScale().fitContent();
}, [historical, markers]);
```

In the chart-creation cleanup (the `return () => { chart.remove(); ... }`), also clear the markers ref:

```tsx
return () => {
  chart.remove();
  chartRef.current = null;
  seriesRef.current = null;
  markersRef.current = null;
};
```

- [ ] **Step 3: Add the caption strip below the chart**

Replace the closing `</div>` of the body section with the caption added before it. The body becomes:

```tsx
<div className="px-5 py-4">
  <div className="relative h-[600px] w-full">
    {/* ...existing absolute-positioned container, loading, error, empty divs... */}
  </div>
  <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground">
    <span>
      {undatedExitCount > 0 &&
        `${undatedExitCount} undated exit${undatedExitCount === 1 ? '' : 's'} not shown`}
    </span>
    <span>
      Data by{' '}
      <a
        href="https://financialmodelingprep.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Financial Modeling Prep
      </a>
    </span>
  </div>
</div>
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`. Open the modal on:

- A position with a buy and one dated exit → green up-arrow at the buy date below the bar; red down-arrow at the exit date above the bar.
- A position with multiple partial exits, all dated → multiple down-arrows.
- A position with at least one **undated** exit → caption shows "N undated exit not shown" (singular if N=1, plural otherwise).
- Switch range presets → markers persist and remain at correct dates.
- Open position (no exits) → only the buy marker; no caption text.

- [ ] **Step 5: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx
git commit -m "feat(portfolio): add buy/exit arrow markers to chart modal"
```

---

## Task 6: Hover tooltip for markers

Goal: When the crosshair sits over a marker's date, show a small floating div near the cursor with details (date, shares, price, and for sells: P&L vs cost).

**Files:**
- Modify: `components/portfolio/PositionChartModal.tsx`

- [ ] **Step 1: Add tooltip state + helpers**

Add to the imports if not already present:

```tsx
import { useCallback } from 'react';
```

Add a discriminated tooltip type and helper near `buildMarkers`:

```tsx
interface MarkerTooltip {
  kind: 'buy' | 'sell';
  date: string; // yyyy-MM-dd
  shares: number;
  price: number;
  pnlDollar?: number;
  pnlPercent?: number;
}

function buildTooltipMap(position: StockPosition): Map<string, MarkerTooltip> {
  const map = new Map<string, MarkerTooltip>();
  const buyDate = format(position.openDate, 'yyyy-MM-dd');
  map.set(buyDate, {
    kind: 'buy',
    date: buyDate,
    shares: position.quantity,
    price: position.cost,
  });

  const isShort = position.type === 'Short';
  for (const exit of position.exits) {
    if (!exit.exitDate) continue;
    const exitDate = format(exit.exitDate, 'yyyy-MM-dd');
    const perShareGain = isShort
      ? position.cost - exit.price
      : exit.price - position.cost;
    const pnlDollar = perShareGain * exit.shares;
    const pnlPercent = position.cost !== 0
      ? (perShareGain / position.cost) * 100
      : 0;
    map.set(exitDate, {
      kind: 'sell',
      date: exitDate,
      shares: exit.shares,
      price: exit.price,
      pnlDollar,
      pnlPercent,
    });
  }
  return map;
}

function formatTooltip(t: MarkerTooltip): string {
  const px = `$${t.price.toFixed(2)}`;
  if (t.kind === 'buy') {
    return `BUY · ${t.date} · ${t.shares} sh @ ${px}`;
  }
  const sign = (t.pnlDollar ?? 0) >= 0 ? '+' : '';
  const pnl = `${sign}$${(t.pnlDollar ?? 0).toFixed(2)} (${sign}${(t.pnlPercent ?? 0).toFixed(2)}%)`;
  return `SELL · ${t.date} · ${t.shares} sh @ ${px} · ${pnl}`;
}
```

- [ ] **Step 2: Wire crosshair subscription + tooltip element**

Add tooltip state in the component:

```tsx
const [tooltip, setTooltip] = useState<{
  text: string;
  x: number;
  y: number;
} | null>(null);

const tooltipMap = useMemo(
  () => (position ? buildTooltipMap(position) : new Map<string, MarkerTooltip>()),
  [position]
);
```

Replace the chart-creation `useEffect` so it also subscribes to crosshair moves. Use the latest `tooltipMap` via a ref to avoid re-creating the chart when the map changes:

```tsx
const tooltipMapRef = useRef(tooltipMap);
useEffect(() => {
  tooltipMapRef.current = tooltipMap;
}, [tooltipMap]);

// (existing chart-creation useEffect body, with this added before the return cleanup:)
const handleCrosshair = (param: Parameters<Parameters<IChartApi['subscribeCrosshairMove']>[0]>[0]) => {
  if (!param.point || !param.time) {
    setTooltip(null);
    return;
  }
  const timeStr = typeof param.time === 'string' ? param.time : null;
  if (!timeStr) {
    setTooltip(null);
    return;
  }
  const hit = tooltipMapRef.current.get(timeStr);
  if (!hit) {
    setTooltip(null);
    return;
  }
  setTooltip({
    text: formatTooltip(hit),
    x: param.point.x,
    y: param.point.y,
  });
};
chart.subscribeCrosshairMove(handleCrosshair);
```

And in the cleanup, unsubscribe:

```tsx
return () => {
  chart.unsubscribeCrosshairMove(handleCrosshair);
  chart.remove();
  chartRef.current = null;
  seriesRef.current = null;
  markersRef.current = null;
};
```

Render the tooltip overlay inside the chart container (sibling of the `containerRef` div):

```tsx
{tooltip && (
  <div
    className="pointer-events-none absolute z-10 px-2 py-1 text-[11px] font-mono bg-popover border border-border rounded shadow-md whitespace-nowrap"
    style={{
      left: Math.min(tooltip.x + 12, 900),
      top: Math.max(tooltip.y - 30, 0),
    }}
  >
    {tooltip.text}
  </div>
)}
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`. Open the modal on a position with a buy and at least one dated exit.

- Hover the crosshair over the buy bar's date → tooltip shows `BUY · YYYY-MM-DD · {qty} sh @ $X.XX`.
- Hover an exit bar's date → `SELL · YYYY-MM-DD · {shares} sh @ $X.XX · +$X.XX (+X.XX%)` for a winning trade. Sign flips for a loser.
- For a Short position with exit price < cost → P&L should be **positive**.
- Hover bars without markers → no tooltip.
- Move the cursor outside the chart → tooltip disappears.

- [ ] **Step 4: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx
git commit -m "feat(portfolio): add hover tooltip for buy/exit markers"
```

---

## Task 7: Theme reactivity

Goal: When the user toggles light/dark mode while the modal is open, the chart redraws with the new theme colors (background, grid, text). The bar up/down colors stay fixed (semantic green/red).

**Files:**
- Modify: `components/portfolio/PositionChartModal.tsx`

- [ ] **Step 1: Apply theme via `chart.applyOptions` on theme change**

Add a new `useEffect` after the chart-creation effect:

```tsx
useEffect(() => {
  const chart = chartRef.current;
  if (!chart) return;
  const isLight = resolvedTheme === 'light';
  chart.applyOptions({
    layout: {
      background: { color: isLight ? '#FFFFFF' : '#0F0F0F' },
      textColor: isLight ? '#0F172A' : '#F2F2F2',
    },
    grid: {
      vertLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
      horzLines: { color: isLight ? 'rgba(15,23,42,0.08)' : 'rgba(242,242,242,0.06)' },
    },
  });
}, [resolvedTheme]);
```

- [ ] **Step 2: Manual verification**

Run `npm run dev`. Open the modal.

- With dark theme: background `#0F0F0F`, light text, dim gridlines.
- Toggle to light theme (via the app's theme toggle, without closing the modal): background flips to white, text/grid update. No remount, no flash.
- Toggle back to dark: same in reverse.
- Close and reopen the modal in either theme → renders correctly from the start.

- [ ] **Step 3: Commit**

```bash
git add components/portfolio/PositionChartModal.tsx
git commit -m "feat(portfolio): make chart modal theme-reactive"
```

---

## Final acceptance walkthrough

After all tasks merge, run through every item in the spec's "Manual verification" section once more:

1. Click a stock symbol on a closed position → modal opens with bar chart, log scale, buy + exit markers.
2. Hover markers → tooltip shows correct numbers; sells show P&L vs cost.
3. Range buttons swap data (verify network calls in devtools).
4. Click an option symbol (e.g., `MU 04/17/2026 470.00 C`) → no click handler, no cursor change.
5. Close modal, reopen on different symbol → chart shows new symbol's data, no flash of old data.
6. Toggle theme → chart colors update.

If all six pass, the feature is done.
