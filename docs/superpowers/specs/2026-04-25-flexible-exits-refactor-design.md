# Flexible Exits Refactor — Design

**Status:** Approved · **Date:** 2026-04-25 · **Spec:** 1 of 2 (next: position chart modal)

## Context

Today every `portfolio_position` row stores three hardcoded exit slots — `price_target_1` (PT1 = 2R), `price_target_2` (PT2 = 5R), and `price_target_3` (the "21-day trail" final exit) — together with two `_quantity` fields. This caps every position at three exits and conflates "planned target" with "actual fill price." None of the slots record a fill date, which prevents accurate per-exit charting (the motivation for spec 2).

This spec replaces the three slots with a flexible `portfolio_position_exit` table: one row per exit, each with its own price, shares, optional date, and notes. A null date means "planned, not yet filled"; a non-null date means "this exit happened on that date." Positions can have any number of exits.

## Goals

- Variable number of exits per position, each with its own date.
- Honest separation of planned vs. filled (`exit_date` is the flag).
- Default UX matches today's: every new position starts with two seeded rows at 2R and 5R (shares=0, date=null).
- Realized gain, R-multiple, remaining shares, and closed date all derived from the exits — no drift between stored and computed values.
- Single migration cutover; no dual-write transition; no legacy fields left behind.

## Non-goals

- Flexible *entries*. The `cost` + `quantity` model on the position stays as one averaged entry. Adds/DCA modeling is out of scope.
- Drag-to-reorder exits. `sort_order` is in the schema but assigned deterministically (chronological); manual reordering is reserved for future work.
- New test runner. The project has none today and this spec doesn't introduce one. Verification is TypeScript + lint + build + manual smoke.
- The position chart modal that consumes these new exit rows. Separate spec (spec 2).

## Decisions Locked

| Decision | Choice | Rationale |
|---|---|---|
| Plan vs actual model | One row per exit; `exit_date` field is the planned/filled flag | Simplest, mirrors how the user already thinks about it |
| Default rows on new position | 2 rows seeded: 2R + 5R, shares=0, date=null | Matches today's behavior so muscle memory carries over |
| 21-day trail | Removed | Constantly fluctuates — not a stable plan |
| Migration | Plan B backfill: closed positions get `closedDate` on the final row; trims and open positions get null dates | Preserves history; honest about unknowns |
| Portfolio table column | Option B: collapsed summary cell with click-to-expand sub-table | Compact default, full detail on demand |
| Notes column on each exit | Yes | Cheap to add now; useful for trade journaling |
| Sort | Chronological — filled rows by `exit_date` asc, planned rows last | Natural reading order |
| `closedDate` | Auto-derived on every exit mutation: `max(exit_date)` when fully filled, else null | Single source of truth; no drift |
| Validation | Filled-only strict: `sum(shares where exit_date IS NOT NULL) <= quantity` | Plans free to over-allocate; fills can't |
| `remaining_shares` | Dropped from schema; derived | One source of truth |
| Rollout | Single clean cutover, single PR | No transitional code to remove later |
| EditPosition modal layout | Tabbed: "Position" tab + "Exits" tab; planned rows shown with PLAN badge + muted text | Compact modal height; clear visual distinction for plans |
| File extraction | Pull `EditPositionModal` into `components/portfolio/EditPositionModal.tsx` and the new exits cell into `components/portfolio/ExitsCell.tsx` | Limits the size of `app/portfolio/page.tsx`; matches "design for isolation" guidance |

---

## 1. Schema & Migration

### 1.1 New table: `portfolio_position_exit`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` | |
| `position_id` | `int8` NOT NULL, FK → `portfolio_position(trade_key)` ON DELETE CASCADE | |
| `price` | `numeric(18,6)` NOT NULL | |
| `shares` | `numeric(18,6)` NOT NULL CHECK (`shares > 0`) | partial shares allowed |
| `exit_date` | `date` NULL | NULL = planned, not filled |
| `notes` | `text` NULL | freeform per-row annotation |
| `sort_order` | `int4` NOT NULL DEFAULT 0 | for stable display order |
| `created_at` | `timestamptz` NOT NULL DEFAULT `now()` | |

**Indexes:** `(position_id, sort_order)` — covers the per-position fetch with ordered display.

### 1.2 Changes to `portfolio_position`

Drop, after the backfill SQL runs:
- `price_target_1`, `price_target_1_quantity`
- `price_target_2`, `price_target_2_quantity`
- `price_target_3`
- `remaining_shares`

`close_date` stays as a stored column but becomes app-managed (see Section 3.3). No DB trigger.

### 1.3 Backfill rule (Plan B)

For every existing position, generate up to three exit rows by reading the legacy fields:

- Row from PT1 if `price_target_1 > 0` AND `price_target_1_quantity > 0`. `sort_order = 0`.
- Row from PT2 if `price_target_2 > 0` AND `price_target_2_quantity > 0`. `sort_order = 1`.
- Row from "21-day final exit" if `price_target_3 > 0`. `sort_order = 2`. Shares = `quantity - price_target_1_quantity - price_target_2_quantity`.

Date assignment:
- For positions with a non-null `close_date`: stamp `exit_date = close_date` on the **highest-sort_order** row that exists for that position. All earlier rows get NULL (we don't know the trim dates).
- For open positions: every backfilled row gets NULL.

### 1.4 Migration delivery

- File: `supabase/migrations/<timestamp>_flexible_exits.sql`.
- Wrapped in `BEGIN ... COMMIT` so partial failure leaves the DB unchanged.
- Applied via `npx supabase db push` (CLI now installed at v2.95.3 as a `devDependency`; user must run `npx supabase login` and `npx supabase link --project-ref kcibynptcpqgsamhionk` once before first push). Dashboard SQL editor remains a valid fallback.
- Migration runs in order:
  1. `CREATE TABLE portfolio_position_exit ...`
  2. Backfill `INSERT ... SELECT` from existing positions.
  3. `ALTER TABLE portfolio_position DROP COLUMN ...` for the legacy columns.

---

## 2. TypeScript Types & API Surface

### 2.1 New `PositionExit` type (in `hooks/usePortfolio.ts`)

```ts
export interface PositionExit {
  id: string;
  positionId: string;
  price: number;
  shares: number;
  exitDate: Date | null;   // null = planned
  notes: string | null;
  sortOrder: number;
}
```

### 2.2 Updated `StockPosition`

```ts
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
  closedDate: Date | null;   // auto-managed (Section 3.3)
  exits: PositionExit[];     // ordered chronologically (Section 3.4)
  realizedGain: number;      // hydrated from exits at mapping time
  currentPrice?: number;
  // Removed: priceTarget2R, priceTarget2RShares, priceTarget5R,
  //          priceTarget5RShares, priceTarget21Day, remainingShares
}
```

### 2.3 New `SupabasePositionExit` (in `lib/supabase.ts`)

```ts
export interface SupabasePositionExit {
  id: string;
  position_id: number | string;
  price: number;
  shares: number;
  exit_date: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}
```

`SupabasePortfolioPosition` loses the six dropped columns.

### 2.4 Pure helpers (in `utils/portfolioCalculations.ts`)

All four are pure functions of `StockPosition` (and its `exits`). Used both at the hydration boundary and inside mutations.

```ts
export function getRemainingShares(position: StockPosition): number;
export function getRealizedGain(position: StockPosition): number;
export function getRMultiple(position: StockPosition): number | null;
export function isFullyClosed(position: StockPosition): boolean;
```

`calculateRPriceTargets(cost, stopLoss, type)` (existing) is retained — used by the default-row seeding in `addPosition`.

### 2.5 Hook surface additions in `usePortfolio`

```ts
addExit(positionId: string, exit: Omit<PositionExit, 'id' | 'positionId' | 'sortOrder'>): Promise<void>
updateExit(exitId: string, updates: Partial<Omit<PositionExit, 'id' | 'positionId'>>): Promise<void>
deleteExit(exitId: string): Promise<void>
```

`addPosition` is updated to seed the two default rows (2R + 5R) inside the same flow as a two-step insert with try/catch + manual cleanup of the position row if the second insert fails. (No Supabase RPC.)

`updatePosition` no longer accepts the dropped fields.

### 2.6 Read query

A single Supabase select with PostgREST embedding:
```ts
.from('portfolio_position')
.select('*, portfolio_position_exit (*)')
```
returns positions with their exits already populated. No N+1.

---

## 3. Math, Auto-Derivation, and Validation

### 3.1 `getRemainingShares(position)`

```
position.quantity - sum(exit.shares for exit in exits where exit.exitDate is not null)
```
Planned (null-date) rows do NOT reduce remaining shares.

### 3.2 `getRealizedGain(position)`

```
For each exit where exitDate is not null:
  Long:  gain += (exit.price - position.cost) * exit.shares
  Short: gain += (position.cost - exit.price) * exit.shares
```

### 3.3 `getRMultiple(position)` — returns `number | null`

Shares-weighted average R, parity with today's `rMultiple` portfolio column:

```
initialRisk = abs(position.cost - position.initialStopLoss)
if initialRisk == 0 or position.quantity == 0: return null

filledShares = sum(exit.shares where exitDate is not null)
if filledShares == 0: return null

realizedR = sum over filled exits of:
  Long:  ((exit.price - cost) / initialRisk) * exit.shares
  Short: ((cost - exit.price) / initialRisk) * exit.shares

return realizedR / filledShares
```

### 3.4 `isFullyClosed(position)`

```
position.quantity > 0 AND
sum(exit.shares where exitDate is not null) >= position.quantity
```

### 3.4a Per-exit R (used in the EditPositionModal R column and the expanded sub-table)

A per-row scalar — *not* shares-weighted, *not* averaged. Applies to every exit (filled or planned):

```
initialRisk = abs(position.cost - position.initialStopLoss)
if initialRisk == 0: per-row R = null

Long:  perR = (exit.price - position.cost) / initialRisk
Short: perR = (position.cost - exit.price) / initialRisk
```

Display format: `${perR >= 0 ? '+' : ''}${perR.toFixed(1)}R` (e.g. `+2.0R`, `-0.5R`). For planned (null-date) rows, suffix with `" plan"` (e.g. `+3.0R plan`). For null perR, render `—`.

### 3.5 Auto-managed `closedDate`

Applied inside `addExit` / `updateExit` / `deleteExit` after every successful write:

```
After mutation:
  if isFullyClosed(position):
    closedDate = max(exit.exitDate where exitDate is not null)
  else:
    closedDate = null

If closedDate changed, write back to portfolio_position in the same mutation round-trip.
```

Implication, accepted: deleting the latest exit on a fully-closed position auto-reopens it (closedDate → null).

### 3.6 Filled-only strict validation

In `addExit` and `updateExit`, reject the change with a Sonner toast if it would cause:
```
sum(exit.shares where exit_date IS NOT NULL) > position.quantity
```
Toast text: `"Filled exits exceed position size (X / Y shares)"`. Plan rows can over-allocate freely.

### 3.7 Display sort

`StockPosition.exits` is sorted at the hydration boundary:
- Filled rows first, ordered by `exit_date` asc.
- Planned rows last, ordered by `sort_order` asc.

### 3.8 `sort_order` assignment on insert

- The two seeded rows in `addPosition`: 2R row gets `sort_order = 0`, 5R row gets `sort_order = 1`.
- `addExit` from EditPositionModal: `sort_order = (max existing sort_order for the position) + 1`. Computed client-side from the in-memory exits array (we already have it loaded).
- Backfill: rows from PT1/PT2/PT3 get `sort_order = 0/1/2` respectively.

---

## 4. UI: Portfolio Table — `<ExitsCell />`

Replace the five hardcoded columns (`priceTarget2R`, `priceTarget2RShares`, `priceTarget5R`, `priceTarget5RShares`, `priceTarget21Day`) with a single new column `id: 'exits'`, label `"Exits"`.

### 4.1 Collapsed cell

Renders one of:
- `"{filledCount}/{totalCount} filled · {formattedR}"` when `filledCount > 0` — e.g. `2/3 filled · +1.7R`. `formattedR` uses `${value >= 0 ? '+' : ''}${value.toFixed(1)}R`. If `getRMultiple` returns null (zero initial risk), drop the `· {formattedR}` segment.
- `"0/{totalCount} · plan only"` when there are exit rows but `filledCount == 0`.
- `"—"` when there are no exit rows at all.

A small chevron (`▸` / `▾`) on the left of the cell toggles expanded state.

### 4.2 Expanded sub-table (inline below the row)

Renders one row per `PositionExit` in display-sort order. Columns: Price, Shares, Date (or "—" for plans), R (computed, with "plan" suffix for null-date), Notes (truncated with title-attr tooltip if long).

Filled rows: normal foreground.
Planned rows: muted text + a small `PLAN` badge.

The expanded state is local to the row in the React tree; clicking elsewhere does not collapse it. Persisting expand state across reloads is out of scope.

### 4.3 Saved column preferences

`useUserPreferences` may have stored visibility for the dropped column ids (`priceTarget2R`, `priceTarget2RShares`, `priceTarget5R`, `priceTarget5RShares`, `priceTarget21Day`). On read, silently filter out any unknown column ids. The new `exits` column is shown by default.

### 4.4 Extraction

The collapsed/expanded rendering lives in `components/portfolio/ExitsCell.tsx`. Props: `{ position: StockPosition }`. Owns its own expanded/collapsed `useState`.

---

## 5. UI: `<EditPositionModal />` — Tabbed Layout

Extracted to `components/portfolio/EditPositionModal.tsx`. Same props as today (open state, position, save handler).

### 5.1 Tabs

Two tabs at the top of the modal body:

1. **Position** — all existing position-level fields: type, symbol, cost, quantity, initial stop loss, stop loss, open date, closed date (read-only, shown as "(auto)").
2. **Exits** `({totalCount})` — the sub-table of `PositionExit` rows.

Default tab on open: **Exits** if the position has any filled rows, otherwise **Position**.

### 5.2 Exits sub-table — per-row inline fields

| Field | Control | Notes |
|---|---|---|
| Price | numeric input | required |
| Shares | numeric input | required, > 0 |
| Date | `DatePicker` (existing component) | empty = planned |
| Notes | text input, narrow | optional, placeholder `"(optional)"` |
| R | computed text | `+1.7R` or `—`, with "plan" suffix when null-date; not editable |
| × | icon button | remove row; confirm if filled |

Visual state:
- Filled (`exit_date` set) → normal foreground.
- Planned (`exit_date` null) → muted text + `PLAN` badge.
- Validation failure (over-allocated) → red border on offending row + footer error.

### 5.3 Footer of the section

```
Planned: 300 / 300 shares    Filled: 200 / 300 shares    Realized: +$2,140 (+1.7R)
```
The "Filled" tally goes red when it exceeds `quantity`; Save button disabled in that state.

### 5.4 Add / remove behavior

- `+ Add exit` button (top-right of the section) appends a planned row. Defaults: `price = last row's price` (or `cost` if no rows), `shares = 0`, `exit_date = null`. User edits inline.
- Removing a planned row: silent.
- Removing a filled row: confirm dialog `"Remove filled exit of N shares at $X on YYYY-MM-DD? Realized gain will be recalculated."`
- Removing the last filled row of a closed position: same confirm + extra note that the position will auto-reopen.

### 5.5 Save flow

`Save changes` button performs:
1. `updatePosition(...)` for the position-level fields (cost, quantity, stop loss, etc.).
2. Diff the modal's working exits array against the original from props:
   - **Delete:** any exit `id` present in original but not in working set.
   - **Add:** any working-set entry without an `id` (rows added in the modal session).
   - **Update:** any working-set entry whose `id` matches an original but with any changed field (`price`, `shares`, `exit_date`, `notes`).
3. Emit `addExit` / `updateExit` / `deleteExit` calls in sequence (deletes first, then updates, then adds — minimizes the chance of tripping the filled-only-strict check mid-flow).
4. If any single mutation fails: toast names the row (`"Failed to update exit at $X"`), modal stays open, partial successes are kept (no rollback). Mirrors today's per-field error handling.

---

## 6. Downstream Consumers

The `mapSupabaseToPosition` function in `usePortfolio.ts` is the **single hydration boundary**. Supabase rows in → fully-hydrated `StockPosition` (with derived `realizedGain`, `remainingShares`, `closedDate` populated) out. Consumers continue reading these as object properties.

| File | Change |
|---|---|
| `lib/supabase.ts` | Add `SupabasePositionExit`; trim `SupabasePortfolioPosition`. |
| `hooks/usePortfolio.ts` | New `PositionExit` type; updated `StockPosition`; new mapper; new `addExit`/`updateExit`/`deleteExit`; updated `addPosition` (seeds 2 default rows); `updatePosition` no longer accepts dropped fields. |
| `utils/portfolioCalculations.ts` | Add the 4 derived helpers. Keep `calculateRPriceTargets`. |
| `app/portfolio/page.tsx` | `PORTFOLIO_COLUMNS` — drop 5 columns, add `exits`. Row rendering uses `<ExitsCell />`. `handleAddPosition` no longer passes legacy fields. Per-row formatters and column aggregations referencing the dropped fields are updated/removed. `EditPositionModal` import switches to the extracted file. |
| `components/portfolio/ExitsCell.tsx` | NEW. Collapsed summary + expanded sub-table. |
| `components/portfolio/EditPositionModal.tsx` | NEW. Tabbed layout per Section 5. |
| `hooks/useUserPreferences.ts` | Read-time silent filtering of unknown column ids. |
| `components/ui/BacktestTab.tsx`, `hooks/useBacktest.ts`, `utils/backtestCalculations.ts` | NO CHANGE. They consume `realizedGain`, `closedDate`, `cost`, `quantity`, `initialStopLoss` — all preserved on the hydrated `StockPosition`. |
| `utils/transactionCalculations.ts` and `app/transactions/` | Audit during implementation: any direct creation of `priceTarget*` fields needs to route through new `addPosition`. |

---

## 7. Edge Cases

| Case | Behavior |
|---|---|
| Position with 0 exits | Allowed. `realizedGain = 0`, `remainingShares = quantity`, `closedDate = null`. Cell: `—`. |
| Adding an exit on a closed position | Filled-only-strict rejects if it pushes filled total over `quantity`. Otherwise allowed. |
| Editing `quantity` down below current filled total | Save blocked by red-tally. User must reduce/delete filled rows first. |
| Editing `quantity` up | Always allowed; auto-reopens position if `closedDate` was set. |
| Editing `cost` or `initialStopLoss` | Allowed. Realized gain and R recompute. Seeded 2R/5R rows do NOT auto-update (we'd overwrite potential user edits). |
| Deleting a position | `ON DELETE CASCADE` drops all exit rows. |
| Two browser tabs editing same position | Last-write-wins, same as today. |
| Backfill produces 0 rows for a position (all PT prices were 0) | No seeded rows — correct, the position never had exits configured. |
| Negative shares | DB CHECK + UI validation. |
| Sort order collisions | Not a concern; deterministic assignment. |
| Imported transaction creates an "add" on existing symbol | Out of scope. Existing importer behavior unchanged. |

---

## 8. Error Handling

- DB-level errors (constraint violations, FK errors): caught in mutation, surfaced as Sonner toast with row context.
- Validation errors (filled-overflow): blocked client-side before mutation.
- Migration errors during `supabase db push`: surfaced by CLI; transaction rolls back.

---

## 9. Verification Plan

No test runner is in the project. Verification is:

1. `tsc` — no type errors.
2. `npm run lint` — clean.
3. `npm run build` — clean.
4. Manual smoke checks (in order):
   - Run the migration; existing positions still render with the new exits column showing the right summary.
   - Expand a position with backfilled rows → all rows present, dates correct on closed positions, null on open trims.
   - Edit a position → tabbed modal works; add exit, fill date, save, verify realized gain updates.
   - Try to over-allocate filled shares → tally goes red, save blocked.
   - Delete the only filled exit on a closed position → confirm dialog → position auto-reopens.
   - BacktestTab still produces matching outcomes for existing closed positions.

The four pure helpers in `utils/portfolioCalculations.ts` are good unit-test candidates if a test runner is introduced later. Out of scope here.

---

## 10. Out of Scope (handled by spec 2)

- The position chart modal that consumes the new exit rows for chart markers.
- Drag-to-reorder exits.
- Flexible entries (multiple buys per position).
- Introducing a test runner.
