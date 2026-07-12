# Earnings Calendar Table Date Range

**Date:** 2026-07-12  
**Status:** Approved  
**Scope:** Table view on `/calendar` only

## Problem

On the Table tab, the earnings fetch uses the same month derived from `currentDate` as Monthly view, but Table has no month navigation. Changing the displayed period requires switching to Monthly, navigating, then returning to Table.

## Goal

Let users set an arbitrary date range on the Table tab and load earnings for that range without leaving Table.

## Non-goals

- Changing Monthly or Weekly navigation
- Changing `/api/earnings/calendar` or FMP proxy behavior
- Reusing the shared `DatePicker` component (it blocks future dates)
- Presets, URL query params, or persisted preferences

## UX

- Layout: toolbar above the table with **From**, **To** (`type="date"`), and **Apply**
- Refetch only when Apply is clicked (not on every input change)
- Default applied range when Table is first used: current calendar month
- Switching away from Table and back keeps the last applied range
- If From > To on Apply: show a short inline validation message; keep the previous applied range and fetch
- If From or To is empty on Apply: ignore; keep previous applied range

## Data flow

```
draftFrom / draftTo   (controlled inputs)
        │ Apply (validate)
        ▼
appliedFrom / appliedTo
        │
        ▼  when viewMode === 'table'
dateRange { from, to }
        │
        ▼
useEarningsConfirmed(from, to, selectedSymbols)
        │
        ▼
POST/GET /api/earnings/calendar  (existing)
```

Monthly and Weekly continue to derive `dateRange` from `currentDate` / week helpers. Symbol filters (S&P 500, Dow, Nasdaq 100, watchlist, All) are unchanged.

## Implementation touchpoints

- **Primary file:** `app/calendar/page.tsx`
  - Add draft + applied range state (YYYY-MM-DD strings)
  - Initialize applied (and draft) to `getMonthRange(new Date())` once
  - Extend `dateRange` memo: if `viewMode === 'table'`, use applied range; else existing logic
  - Render toolbar above the table in the Table branch (`renderTableView` or wrapper around it)
- **No changes** to `hooks/FMP/useEarningsConfirmed.ts` or `app/api/earnings/calendar/route.ts`

## Edge cases

| Case | Behavior |
|------|----------|
| First open of Table | Applied = current month; fetch that range |
| Apply with From ≤ To | Update applied; React Query refetch via new query key |
| Apply with From > To | Inline error; no applied update |
| Apply with empty field | No-op |
| Large ranges + "All" filter | Allowed; same as today's unfiltered calendar fetch |
| Weekend week fix (prior change) | Unrelated; Weekly still uses updated `getWeekRange` |

## Testing

Manual:

1. Open `/calendar` → Table: shows current month earnings
2. Change From/To without Apply: table data unchanged
3. Apply valid range: table updates; header/context reflects new span if shown
4. Apply From > To: error shown; data unchanged
5. Switch to Monthly, change month, return to Table: last applied Table range preserved
6. Weekly and Monthly still navigate and fetch as before
