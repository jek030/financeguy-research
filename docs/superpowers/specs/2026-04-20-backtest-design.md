# Backtest Feature Design

**Date:** 2026-04-20  
**Status:** Approved  
**Scope:** New "Backtest" tab on the portfolio page for replaying closed trades under configurable stop-loss and exit strategies.

---

## Overview

Add a third tab ("Backtest") to the portfolio page alongside Positions and Stats. The feature lets the user replay their closed trades using a configurable stop-loss method and a fixed trim-based exit strategy (1/3 at 2R, 1/3 at 5R, 1/3 at trailing MA), then compares simulated results to actual results side-by-side.

The primary question it answers: *what would my closed trades have looked like if I had used a different stop placement and followed the system's exit rules exactly?*

---

## Layout

**Side-panel config + scrollable results** (Layout B):

- Left sidebar (~200px): config controls, persistent while scrolling results
- Right area: summary stats bar + horizontally scrollable results table
- The table renders trades progressively as fetches complete (one row at a time)

---

## Configuration Panel

The sidebar contains all backtest parameters. Defaults match the user's ideal system.

### Stop Loss Method (select one)

| Method | Sub-fields |
|---|---|
| Low of Entry Day | None — stop = low of entry candle |
| ATR % | ATR Period (default: 20), Multiplier (default: 1.5×). Formula: Entry − (multiplier × ATR) |
| Straight % | % Below Entry (default: 7%). Formula: Entry × (1 − %) |
| Trailing MA | MA Type (EMA/SMA), Period (default: 21). Exit when close crosses below MA |

Only the selected method's sub-fields are visible (others collapse).

### Exit Strategy

| Field | Default | Description |
|---|---|---|
| Trim 1 fraction | 1/3 | Portion of position sold at Trim 1 target |
| Trim 1 target | 2R | R-multiple at which Trim 1 fires |
| Trim 2 fraction | 1/3 | Portion of position sold at Trim 2 target |
| Trim 2 target | 5R | R-multiple at which Trim 2 fires |
| Trail exit MA type | EMA | Type of MA for final exit |
| Trail exit MA period | 21 | Period for trail exit MA |

The remaining shares after Trim 1 and Trim 2 are exited when the close crosses below the trail exit MA.

**Run button** triggers the simulation.

---

## Simulation Engine

Pure TypeScript utility: `utils/backtestCalculations.ts`

### Inputs

- `trade`: symbol, entry price (`cost`), quantity, `open_date`, `close_date`, `initial_stop_loss`
- `ohlc`: daily candles for the trade period (date, open, high, low, close)
- `maValues`: MA values keyed by date (for trailing MA stop and/or trail exit)
- `config`: stop method + params, trim fractions, trim R-targets, trail exit MA

### Day-by-day logic (evaluated in this order each day)

1. **Stop check** — did today's low breach the sim stop price? If yes, exit all remaining shares at stop price. Trade ends.
2. **Trim 1 check** — did today's high reach the Trim 1 R-target price? If yes and Trim 1 not yet taken, sell Trim 1 fraction at that price.
3. **Trim 2 check** — did today's high reach the Trim 2 R-target price? If yes and Trim 2 not yet taken, sell Trim 2 fraction at that price.
4. **Trail exit check** — did today's close cross below the trail exit MA? If yes and both trims already taken, exit remaining shares at close. Trade ends.

Stop is evaluated before trims. A day that gaps down through the stop does not credit any trim targets.

### Stop price calculation

Calculated once at entry from the selected method:

- **Low of Entry Day** — low of the `open_date` candle
- **ATR %** — Entry − (multiplier × ATR over the ATR period ending on `open_date`)
- **Straight %** — Entry × (1 − percentage)
- **Trailing MA** — dynamic: stop is the MA value for each day (i.e., stop moves up with the MA)

### R-multiple calculation

- **Actual R** — uses `initial_stop_loss` from the DB and `realized_gain` from the portfolio. Because positions may have multiple partial exits (trims), there is no single exit price. Formula: `realized_gain / (quantity × (entry − initial_stop_loss))` — total dollar gain divided by the 1R dollar value.
- **Sim R** — uses the sim stop price. Formula: `(weighted_avg_sim_exit − entry) / (entry − sim_stop_price)`, where the weighted average accounts for partial exits at trim prices and the final exit price.

These are intentionally not directly comparable in dollar terms — the goal is to evaluate each system on its own risk-adjusted terms.

### Gain/loss calculation

Dollar gain is based on position cost basis (entry price × quantity), accounting for partial exits at trim prices and the final exit.

---

## Data Fetching

Hook: `hooks/useBacktest.ts`

- Reads closed positions from the existing `usePortfolio` hook
- For each trade, fetches in parallel (Promise.all):
  - OHLC via `/api/fmp/dailyprices?symbol=X&from=open_date&to=today` — fetches through today so the sim can run past the actual close date if the user exited early
  - MA data via `/api/fmp/technical/moving-average` — one call per MA needed (trail exit MA always; trailing MA stop adds a second call if that method is selected)
- Passes fetched data to `backtestCalculations.ts`
- Returns an array of result objects, each appended as it resolves (progressive rendering)

---

## Results

### Summary Bar

Displayed above the table, updates as trades load:

| Metric | Description |
|---|---|
| Sim Total R | Sum of all sim R-multiples |
| Actual Total R | Sum of all actual R-multiples |
| R Delta | Sim Total − Actual Total |
| Sim Gain $ | Total simulated dollar gain across all trades |
| Actual Gain $ | Total actual dollar gain across all trades |
| Win Rate | % of sim trades that were not stopped out at a loss |

### Results Table

Horizontally scrollable. Columns in order:

| Column | Description |
|---|---|
| Symbol | Ticker |
| Entry $ | Entry price from portfolio |
| Stop $ | Sim stop price (calculated from selected method) |
| Sim Exit $ | Price the sim exited the full position |
| Actual R | R-multiple using `initial_stop_loss` |
| Sim R | R-multiple using sim stop |
| Delta R | Sim R − Actual R |
| Act Gain $ | Actual dollar gain/loss |
| Sim Gain $ | Simulated dollar gain/loss |
| Act Gain % | Actual percentage gain/loss |
| Sim Gain % | Simulated percentage gain/loss |
| Actual Days | Days held in the real trade |
| Sim Days | Days held in the simulation |
| Outcome | Badge: HIT 5R / TRAIL EXIT / STOPPED |

### Loading State

Trades render one row at a time as each fetch + simulation completes. Each pending row shows a skeleton loader in place until its data is ready.

### Error Handling

If FMP returns no price data for a trade (delisted, data gap, etc.):
- The row still appears in the table
- Actual R is shown (calculated from portfolio data alone)
- Sim columns display "—" with a "No price data" tooltip
- The trade is excluded from summary bar totals

---

## File Structure

```
utils/backtestCalculations.ts     # Pure simulation engine (no React, no fetching)
hooks/useBacktest.ts              # Data fetching + orchestration, returns progressive results
components/ui/BacktestTab.tsx     # Tab UI: config sidebar + results table
app/portfolio/page.tsx            # Add "Backtest" tab alongside Positions and Stats
```

No new Supabase tables. No new API routes. All data comes from existing FMP proxy routes and the existing portfolio hook.
