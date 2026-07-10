# Retire Portfolio — Design

**Date:** 2026-07-09  
**Status:** Approved for implementation planning  
**Scope:** Portfolio page + transactions “Add to Portfolio” modal

## Problem

Users need a way to lock an old portfolio so it remains viewable for history/stats, but cannot accept new positions or position edits. Today there is no soft-lock state — only full delete or continued editing.

## Goals

- Allow a user to **retire** the currently selected portfolio.
- While retired:
  - No new positions via **Add Position** on the portfolio page.
  - No edit or delete of positions in the positions table.
  - No adding positions via the transactions **Add to Portfolio** modal.
- Retirement is **reversible** (un-retire restores full mutation ability).
- Retired portfolios remain selectable and fully viewable (positions, calendar, stats, backtest).
- Retired portfolios appear in portfolio dropdowns with a clear visual treatment.

## Non-goals

- Deleting portfolios or cascading delete of positions.
- Hiding retired portfolios from the UI by default.
- Locking portfolio name / starting-balance edits (Edit Portfolio remains allowed).
- Changing Stats/Calendar/Backtest read-only analytics behavior beyond mutation locks.
- Server-side Postgres RLS policies beyond the app’s existing client mutation path (hook guards are required; DB RLS hardening is optional follow-up).

## Decisions

| Decision | Choice |
|---|---|
| Storage | `is_retired boolean not null default false` on `tblPortfolio` |
| Reversible | Yes — Retire / Un-retire toggle |
| Dropdown treatment | Same list, greyed out + **Retired** badge |
| Transactions modal | Visible but **not selectable** when retired |
| Edit Portfolio (name/value) | Still allowed while retired |

## Data model

### Migration

Add column to `public."tblPortfolio"`:

```sql
ALTER TABLE public."tblPortfolio"
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;
```

Optional (not required for v1): `retired_at timestamptz null` for audit. Defer unless needed.

### TypeScript

Extend `SupabasePortfolio` in `lib/supabase.ts`:

```ts
is_retired?: boolean; // treat missing/undefined as false for backward compatibility during rollout
```

Prefer normalizing to `boolean` when mapping portfolio rows (`Boolean(row.is_retired)`).

## Hook API (`hooks/usePortfolio.ts`)

### New / updated surface

- Read `is_retired` when fetching portfolios / current portfolio.
- Expose `isRetired` derived from current `portfolio` (or `portfolio?.is_retired === true`).
- Add `setPortfolioRetired(retired: boolean)` (or `retirePortfolio` / `unretirePortfolio`) that updates `tblPortfolio.is_retired` for the current portfolio key and refreshes local state (`portfolio` + `portfolios` list).

### Mutation guards

When the **current** portfolio is retired, reject with a clear error (and no Supabase write) for:

- `addPosition` (and any create-position path)
- `updatePosition`
- `deletePosition`
- Exit mutations that modify position state: `addExit`, `updateExit`, `deleteExit` (if present)

Rationale: UI can be bypassed; hook guards keep transactions import and other callers consistent.

**Allowed while retired:**

- `updatePortfolio` / `updatePortfolioValue` (name + starting balance)
- `setPortfolioRetired(false)` (un-retire)
- All reads / selection / default-portfolio preference

When adding from transactions, the selected target portfolio’s `is_retired` must be checked (not only the currently selected portfolio on the portfolio page). Prefer a shared helper:

```ts
assertPortfolioMutable(portfolio: { is_retired?: boolean })
```

## UI — Portfolio page

### Toolbar

- Add a **Retire** button near Edit Portfolio (pencil).
- When `is_retired`:
  - Button becomes **Un-retire** (or same control with toggled label/icon).
  - Show a small **Retired** badge near the portfolio selector / toolbar so state is obvious without opening a menu.
- Retire opens a confirmation dialog:

  > Retire this portfolio? You won’t be able to add, edit, or delete positions until you un-retire it. Stats and history remain available.

- Un-retire can be immediate or a lighter confirm; prefer a short confirm for symmetry.

### Positions tab locks

When retired:

- **Add Position** panel: disabled inputs + primary action disabled, with helper text: “This portfolio is retired.”
- Positions table: hide or disable Edit and Delete action buttons.
- Chart / view-only actions may remain enabled.

### Dropdown (portfolio selector)

- Each retired portfolio option is visually muted (greyed) and shows a **Retired** badge/label.
- Options remain **selectable** so the user can view history and un-retire.

## UI — Transactions “Add to Portfolio” modal

- Portfolio dropdown lists retired portfolios with the same greyed + **Retired** treatment.
- Retired options are **not selectable** (`disabled` on `SelectItem` or equivalent).
- If the previously remembered selection becomes retired, clear selection / force user to pick an active portfolio before confirming.

## Edge cases

| Case | Behavior |
|---|---|
| Retire while Add Position form has draft fields | Allow retire; form becomes disabled; draft can be discarded or left inert |
| Retire while Edit Position modal open | Close modal or block save; prefer close on successful retire |
| Default portfolio is retired | Still valid as default for navigation; mutations still blocked |
| Create new portfolio | Always created with `is_retired = false` |
| Missing column during deploy race | Treat undefined as active; migration must ship before/with app release |

## Testing / verification

1. Retire current portfolio → Add Position disabled; edit/delete hidden/disabled; stats still load.
2. Un-retire → mutations restored.
3. Portfolio dropdown shows Retired badge and muted styling; can still select.
4. Transactions Add to Portfolio: retired row visible, not selectable; active portfolios still work.
5. Hook guard: calling add/update/delete while retired throws and does not write.
6. Edit Portfolio name still works while retired.

## Out of scope follow-ups

- Postgres RLS / trigger enforcing no position writes when parent portfolio is retired.
- Bulk retire, archive, or soft-delete.
- Filtering Active vs Retired in the dropdown.
