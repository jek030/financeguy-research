# Transactions Page Redesign — Design

**Date:** 2026-06-15
**Route:** `/transactions` (`app/transactions/page.tsx`)
**Status:** Approved (design), pending implementation plan

## Goal

Modernize the transactions page visually and simplify it to the features that matter. Keep all working parsing/aggregation logic; this is primarily a restyle + trim.

## Approach

Restyle and simplify the **existing** components in place. Reuse:

- `utils/transactionCalculations.ts` (parsing + aggregation, unchanged)
- `JsonUploader` (upload logic + localStorage persistence, restyled)
- `TransactionTable` (TanStack table, refactored toolbar)
- `SymbolSummaryTable` / `ActionSummaryTable` (By Symbol / By Action tabs, restyled)

Rejected alternative: full rebuild — throws away working code for no benefit.

## Visual Direction — "Bold Dashboard" (option C)

- Dark surface with subtle gradient stat cards.
- Indigo/purple gradient accent on the active tab; teal accent on the Total Fees stat.
- Sans-serif on this page (drop the `font-mono` look used elsewhere).

**Accepted tradeoff:** the rest of the app uses a dark monospace "terminal" aesthetic. This page is intentionally distinct; the purple/teal accents are page-local.

## Layout (top to bottom)

1. **Header** — page title + drag-and-drop uploader (current upload logic, restyled).
2. **Stat cards (3 only)** — `Total Transactions`, `Total Fees`, `Date Range`.
   - **Removed:** Net Cash Flow, Total Volume, Buy/Sell Volume, unique-symbols emphasis, and the clickable action-type chip row.
3. **Tabs** — `Transactions` · `By Symbol` · `By Action` (same set as today).
4. **Transactions tab** — toolbar + table.

## Transactions Table Toolbar

Controls (left to right, responsive wrap):

- **Search** — free-text global filter.
- **Type filter** — **multi-select dropdown** listing every raw action present in the data (e.g. Buy, Sell, Sell Short, Qualified Dividend, Buy to Open, …). Shows a count badge when one or more types are active.
- **Symbol filter** — single-select dropdown of symbols present in the data.
- **Page-size selector** — 25 / 50 / 100.

Table behavior:

- Column-header sorting (default: date descending).
- Bottom pagination with row counts.
- **No CSV export button** (removed).

## Filtering Consolidation

Today filtering is split between page-level state (`actionFilters`, `symbolFilter`) and the table's own internal column filters, which is redundant.

Redesign: the `TransactionTable` owns search / type / symbol filtering. The "By Symbol" tab row-click still jumps to the Transactions tab with that symbol pre-selected (controlled symbol filter passed from the page, or equivalent).

## By Symbol / By Action Tabs

Kept as-is functionally; restyled to match the Bold Dashboard theme. By Symbol row click → Transactions tab filtered to that symbol.

## Out of Scope

- Export (table/CSV) — explicitly removed.
- Charts, open-positions, and other stats beyond the three named cards.
- Changes to parsing/aggregation logic.

## Success Criteria

- Page renders the Bold Dashboard styling with exactly three stat cards (Total Transactions, Total Fees, Date Range).
- Drag-and-drop upload still loads + persists data.
- Transactions table supports search, multi-select type filter, symbol filter, page-size, sorting, pagination — no export button.
- By Symbol and By Action tabs present and functional; By Symbol click filters the Transactions tab.
- `npm run lint` and `npm run build` pass.
