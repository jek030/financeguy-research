# Earnings Calendar Table Date Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the Earnings Calendar Table tab, let users enter From/To dates and Apply to fetch that range without switching to Monthly.

**Architecture:** Keep draft input state separate from the applied range that drives `dateRange`. When `viewMode === 'table'`, `useEarningsConfirmed` uses the applied range; Monthly/Weekly keep using `currentDate` / week helpers. No API or hook changes.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, TanStack Query (`useEarningsConfirmed`), existing `Input` / `Button` UI.

**Testing:** No automated test runner is configured. Each task ends with **manual verification** (and `npm run lint` where noted) before committing.

**Spec:** `docs/superpowers/specs/2026-07-12-earnings-table-date-range-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `app/calendar/page.tsx` | Table draft/applied range state, Apply validation, `dateRange` branching, toolbar UI |

**Do not modify:** `hooks/FMP/useEarningsConfirmed.ts`, `app/api/earnings/calendar/route.ts`, `components/ui/date-picker.tsx`.

**Note:** `app/calendar/page.tsx` may already have an unrelated uncommitted change (`getWeekRange` weekend → next week). Keep that change; commit it separately before or after this feature if it is still uncommitted when you start.

---

### Task 1: State + wire `dateRange` for Table

**Files:**
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Add draft/applied range state**

Near the other `useState` calls (around `viewMode` / `tableSortColumn`), initialize from the current calendar month:

```tsx
const initialTableRange = getMonthRange(new Date());
const [draftFrom, setDraftFrom] = useState(initialTableRange.from);
const [draftTo, setDraftTo] = useState(initialTableRange.to);
const [appliedFrom, setAppliedFrom] = useState(initialTableRange.from);
const [appliedTo, setAppliedTo] = useState(initialTableRange.to);
const [tableRangeError, setTableRangeError] = useState<string | null>(null);
```

`getMonthRange` is already defined above the component — that is fine for the initial values (runs once per mount).

- [ ] **Step 2: Branch `dateRange` for table mode**

Replace the existing `dateRange` memo:

```tsx
const dateRange = useMemo(() => {
  if (viewMode === 'table') {
    return { from: appliedFrom, to: appliedTo };
  }
  if (viewMode === 'weekly') {
    return { from: weekInfo.from, to: weekInfo.to };
  }
  return getMonthRange(currentDate);
}, [viewMode, currentDate, weekInfo, appliedFrom, appliedTo]);
```

`useEarningsConfirmed(dateRange.from, dateRange.to, selectedSymbols)` stays as-is — query key already includes `from`/`to`, so Apply updating applied state will refetch.

- [ ] **Step 3: Manual verification**

1. `npm run dev` → open `/calendar`
2. Table tab still loads the current month (same as before)
3. Monthly / Weekly still navigate and load correctly

- [ ] **Step 4: Commit**

```bash
git add app/calendar/page.tsx
git commit -m "feat(calendar): drive table view from applied date range state"
```

If the weekend `getWeekRange` fix is still uncommitted in the same file, either:
- commit it first alone (`fix(calendar): show next week on Sat/Sun in weekly view`), then make Task 1 changes and commit, or
- include both only if you intentionally want one commit (prefer separate).

---

### Task 2: Apply handler + validation

**Files:**
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Add `handleApplyTableRange`**

Place near `navigateBack` / `navigateForward`:

```tsx
const handleApplyTableRange = () => {
  if (!draftFrom || !draftTo) {
    return;
  }
  if (draftFrom > draftTo) {
    setTableRangeError('From date must be on or before To date');
    return;
  }
  setTableRangeError(null);
  setAppliedFrom(draftFrom);
  setAppliedTo(draftTo);
};
```

String compare works for `YYYY-MM-DD` (same approach as the API route).

- [ ] **Step 2: Manual verification**

Temporarily call `handleApplyTableRange` from the React DevTools console is unnecessary — verification lands fully in Task 3 once the button exists. For this task, confirm the function compiles (`npm run lint` on the file / no TS errors in the IDE).

- [ ] **Step 3: Commit**

```bash
git add app/calendar/page.tsx
git commit -m "feat(calendar): validate and apply table date range"
```

---

### Task 3: Toolbar UI above the table

**Files:**
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Wrap Table render with toolbar**

`Input` and `Button` are already imported. Change the Table branch so the toolbar sits above `renderTableView()`.

Find:

```tsx
{viewMode === 'table' ? (
  renderTableView()
) : (
```

Replace with:

```tsx
{viewMode === 'table' ? (
  <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="table-from" className="text-xs text-muted-foreground uppercase tracking-wide">
          From
        </label>
        <Input
          id="table-from"
          type="date"
          value={draftFrom}
          onChange={(e) => {
            setDraftFrom(e.target.value);
            setTableRangeError(null);
          }}
          className="h-8 w-[160px] rounded-none bg-background/50 border-border/60 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="table-to" className="text-xs text-muted-foreground uppercase tracking-wide">
          To
        </label>
        <Input
          id="table-to"
          type="date"
          value={draftTo}
          onChange={(e) => {
            setDraftTo(e.target.value);
            setTableRangeError(null);
          }}
          className="h-8 w-[160px] rounded-none bg-background/50 border-border/60 text-sm"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleApplyTableRange}
        className="h-8 rounded-none px-3 text-xs"
      >
        Apply
      </Button>
    </div>
    {tableRangeError ? (
      <p className="text-xs text-rose-600 dark:text-rose-400">{tableRangeError}</p>
    ) : null}
    {renderTableView()}
  </div>
) : (
```

Do **not** update draft inputs from `applied*` on every render — draft is only for editing; applied drives the fetch. Clearing the error on draft change is intentional.

- [ ] **Step 2: Full manual verification**

With `npm run dev` at `/calendar`:

1. Open Table → current month rows load; From/To show that month’s first/last day
2. Change From/To without Apply → table data unchanged
3. Apply a valid wider or different range (e.g. first of last month → end of next month) → table updates
4. Apply with From > To → error message; table still shows previous applied range
5. Clear a field and click Apply → no-op (previous data remains)
6. Switch to Monthly, change month, return to Table → last applied Table range still active; drafts still show what you left in the inputs
7. Weekly and Monthly navigation still work

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no new errors from `app/calendar/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add app/calendar/page.tsx
git commit -m "feat(calendar): add From/To Apply toolbar on earnings table view"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| From/To + Apply toolbar above table | Task 3 |
| Refetch only on Apply | Tasks 1–2 (draft vs applied) |
| Default = current calendar month | Task 1 |
| Preserve applied range across tab switches | Task 1 (state lives for page lifetime) |
| From > To → inline error, keep previous fetch | Task 2 + 3 |
| Empty From/To on Apply → ignore | Task 2 |
| No API/hook/DatePicker changes | File map |
| Monthly/Weekly unchanged | Task 1 `dateRange` branch |

---

## Out of scope (do not implement)

- Presets, URL params, localStorage
- Syncing Table range into Monthly `currentDate`
- Changing `DatePicker` future-date disable logic
