# Transactions Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `/transactions` to a "Bold Dashboard" look, trim stats to three (Total Transactions, Total Fees, Date Range), replace the action filter with a multi-select type dropdown, remove CSV export, and keep the By Symbol / By Action tabs.

**Architecture:** In-place restyle + simplify of existing components. Parsing/aggregation in `utils/transactionCalculations.ts` is untouched. The `TransactionTable` becomes the single owner of search / type / symbol / page-size filtering; the page passes the full transaction list plus a controlled symbol filter so a By Symbol row-click still drills into the Transactions tab.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix `DropdownMenu`, `Select`, `Card`, `Tabs`), TanStack Table v8, lucide-react.

> **No test runner exists in this repo.** Verification for every task is: `npm run lint` (no new errors) + `npm run build` (compiles) + the manual browser checks listed in each task. Do not add a test framework.

## Theme tokens (used across all tasks)

Use these exact class strings for the Bold Dashboard look so components stay consistent:

- **Page shell:** `min-h-screen w-full bg-[#0b0e1f] text-slate-100 font-sans p-4`
- **Card surface:** `rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20`
- **Stat label:** `text-[11px] font-medium uppercase tracking-[0.12em] text-indigo-300/70`
- **Stat value (default):** `text-2xl font-bold text-slate-50`
- **Fees accent value:** `text-2xl font-bold text-teal-300`
- **Date-range accent value:** `text-xl font-bold text-violet-300`
- **Active tab:** `data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white`
- **Tab list:** `bg-[#14172c] border border-indigo-500/15`
- **Inactive tab text:** `text-indigo-200/60`

---

### Task A: Multi-select filter function on the Action column

**Files:**
- Modify: `components/ui/(transactions)/TransactionTableColumns.tsx`

- [ ] **Step 1: Add a multi-include filter function and apply it to the `action` column**

Add the import for `FilterFn` and define the function near the top of the file (after the existing imports, before `SortableHeader`):

```tsx
import { ColumnDef, FilterFn } from '@tanstack/react-table';

// Keep a row if no types are selected, otherwise only rows whose action is selected.
export const multiIncludeFilter: FilterFn<BrokerageTransaction> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue || filterValue.length === 0) return true;
  return filterValue.includes(row.getValue<string>(columnId));
};
```

Then change the `action` column's `filterFn` from `'equals'` to the new function:

```tsx
    {
      accessorKey: 'action',
      header: ({ column }) => <SortableHeader column={column} label="Action" />,
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
      filterFn: multiIncludeFilter,
    },
```

Leave the `symbol` column `filterFn: 'equals'` as-is.

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: no new errors in `TransactionTableColumns.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "components/ui/(transactions)/TransactionTableColumns.tsx"
git commit -m "feat(transactions): add multi-include filter fn for action column"
```

---

### Task B: TransactionTable — multi-select type dropdown, controlled symbol filter, remove export, restyle

**Files:**
- Modify: `components/ui/(transactions)/TransactionTable.tsx`

- [ ] **Step 1: Update imports**

Replace the lucide import line and add the DropdownMenu import. Remove `Download` (export icon) and `Filter`; add `ChevronDown`, `ListFilter`:

```tsx
import { Search, ChevronLeft, ChevronRight, ChevronDown, ListFilter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
```

- [ ] **Step 2: Update the props interface to allow a controlled symbol filter**

```tsx
interface TransactionTableProps {
  data: BrokerageTransaction[];
  symbolFilter?: string | null;
  onSymbolFilterChange?: (value: string | null) => void;
  className?: string;
}

export default function TransactionTable({
  data,
  symbolFilter,
  onSymbolFilterChange,
  className,
}: TransactionTableProps) {
```

- [ ] **Step 3: Add type-filter state and controlled symbol wiring**

Inside the component, after the existing `useState` declarations (sorting, columnFilters, globalFilter, pageSize, modal), add:

```tsx
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [internalSymbol, setInternalSymbol] = useState<string | null>(null);

  const symbol = symbolFilter !== undefined ? symbolFilter : internalSymbol;
  const setSymbol = onSymbolFilterChange ?? setInternalSymbol;

  const toggleType = React.useCallback((action: string) => {
    setTypeFilters((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  }, []);
```

- [ ] **Step 4: Drive the column filters from state via effects**

After the existing `React.useEffect` that calls `table.setPageSize(pageSize)`, add two effects:

```tsx
  React.useEffect(() => {
    table.getColumn('action')?.setFilterValue(typeFilters.length ? typeFilters : undefined);
  }, [typeFilters, table]);

  React.useEffect(() => {
    table.getColumn('symbol')?.setFilterValue(symbol ?? undefined);
  }, [symbol, table]);
```

- [ ] **Step 5: Delete the `exportToCSV` function**

Remove the entire `const exportToCSV = () => { ... };` block (currently lines ~78-102).

- [ ] **Step 6: Replace the header/toolbar JSX**

Replace the `<CardHeader>...</CardHeader>` block with this (Bold Dashboard styling, no Export button, multi-select Type dropdown, controlled Symbol select, page-size select):

```tsx
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight text-slate-100">
              All Transactions
            </CardTitle>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-indigo-300/60" />
              <Input
                placeholder="Search transactions..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="h-9 max-w-sm border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type multi-select */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 hover:bg-[#1b1f3b]"
                  >
                    <ListFilter className="h-3.5 w-3.5 text-indigo-300/70" />
                    Type
                    {typeFilters.length > 0 && (
                      <span className="ml-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                        {typeFilters.length}
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-72 w-56 overflow-y-auto border-indigo-500/20 bg-[#14172c] text-slate-100"
                >
                  <DropdownMenuLabel className="text-indigo-300/70">
                    Transaction types
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-indigo-500/15" />
                  {uniqueActions.map((action) => (
                    <DropdownMenuCheckboxItem
                      key={action}
                      checked={typeFilters.includes(action)}
                      onCheckedChange={() => toggleType(action)}
                      onSelect={(e) => e.preventDefault()}
                      className="text-xs focus:bg-indigo-500/15"
                    >
                      {action}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Symbol filter (controlled) */}
              <Select
                value={symbol ?? 'all'}
                onValueChange={(value) => setSymbol(value === 'all' ? null : value)}
              >
                <SelectTrigger className="h-9 w-[130px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Symbols</SelectItem>
                  {uniqueSymbols.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Page size */}
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-9 w-[80px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
```

- [ ] **Step 7: Restyle the Card wrapper and table chrome**

Change the root `<Card>` className to:

```tsx
    <Card className={cn("w-full rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20", className)}>
```

In the table body, update the header row and zebra striping to the dark palette:
- Header `<TableRow>` className: `"border-indigo-500/15 bg-[#0f1226]"`
- Header `<TableHead>` className: keep layout, change text color to `text-indigo-300/70` (replace `text-muted-foreground`); for sticky keep `bg-[#0f1226]`.
- Body `<TableRow>` className: `cn("border-indigo-500/10 hover:bg-indigo-500/10", index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]")`
- Sticky body `<TableCell>` background: `bg-[#14172c]`
- "No transactions found." cell text: `text-slate-400`
- Outer table container border: `border-indigo-500/15`
- Pagination text: `text-slate-400`; pagination buttons className add `border-indigo-500/20 bg-[#0f1226] text-slate-100 hover:bg-[#1b1f3b]`

- [ ] **Step 8: Verify**

Run: `npm run lint`
Expected: no new errors. `uniqueSymbols` and `uniqueActions` are still referenced; `Download`/`Filter` imports are gone.

- [ ] **Step 9: Commit**

```bash
git add "components/ui/(transactions)/TransactionTable.tsx"
git commit -m "feat(transactions): multi-select type filter, controlled symbol filter, remove export, restyle"
```

---

### Task C: Simplify stat cards + rewire the page

**Files:**
- Modify: `components/ui/(transactions)/TransactionSummaryCards.tsx`
- Modify: `app/transactions/page.tsx`

- [ ] **Step 1: Replace `TransactionSummaryCards.tsx` entirely**

Three stat cards only (Total Transactions, Total Fees, Date Range). No action chips, no secondary metrics, no extra props:

```tsx
"use client";

import React from 'react';
import { Receipt, Coins, CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { TransactionSummary } from '@/lib/types/transactions';
import { formatCurrency } from '@/utils/transactionCalculations';
import { cn } from '@/lib/utils';

interface TransactionSummaryCardsProps {
  summary: TransactionSummary;
  className?: string;
}

export default function TransactionSummaryCards({ summary, className }: TransactionSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Transactions',
      value: summary.totalTransactions.toLocaleString(),
      icon: Receipt,
      iconWrap: 'bg-indigo-500/15 text-indigo-300',
      valueClass: 'text-2xl font-bold text-slate-50',
    },
    {
      label: 'Total Fees',
      value: formatCurrency(summary.totalFees),
      icon: Coins,
      iconWrap: 'bg-teal-500/15 text-teal-300',
      valueClass: 'text-2xl font-bold text-teal-300',
    },
    {
      label: 'Date Range',
      value: `${summary.dateRange.from} – ${summary.dateRange.to}`,
      icon: CalendarRange,
      iconWrap: 'bg-violet-500/15 text-violet-300',
      valueClass: 'text-xl font-bold text-violet-300',
    },
  ];

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20"
          >
            <CardContent className="flex items-center justify-between gap-4 py-5">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-indigo-300/70">
                  {card.label}
                </p>
                <p className={card.valueClass}>{card.value}</p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", card.iconWrap)}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/transactions/page.tsx` entirely**

Removes page-level `actionFilters`, the chip handler, the filter indicator, and the `filteredTransactions` memo (the table filters now). Wires the controlled symbol filter and applies the page shell styling:

```tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { TransactionFile } from '@/lib/types/transactions';
import {
  calculateTransactionSummary,
  calculateSymbolSummaries,
  calculateActionSummaries,
} from '@/utils/transactionCalculations';

import JsonUploader from '@/components/ui/(transactions)/JsonUploader';
import TransactionSummaryCards from '@/components/ui/(transactions)/TransactionSummaryCards';
import TransactionTable from '@/components/ui/(transactions)/TransactionTable';
import SymbolSummaryTable from '@/components/ui/(transactions)/SymbolSummaryTable';
import ActionSummaryTable from '@/components/ui/(transactions)/ActionSummaryTable';

export default function TransactionsPage() {
  const [transactionData, setTransactionData] = useState<TransactionFile | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [symbolFilter, setSymbolFilter] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('transactions-data');
        if (stored) {
          setTransactionData(JSON.parse(stored) as TransactionFile);
        }
      } catch (error) {
        console.warn('Could not load from localStorage:', error);
      }
    }
  }, []);

  const summary = useMemo(
    () => (transactionData ? calculateTransactionSummary(transactionData.transactions) : null),
    [transactionData]
  );

  const symbolSummaries = useMemo(
    () => (transactionData ? calculateSymbolSummaries(transactionData.transactions) : []),
    [transactionData]
  );

  const actionSummaries = useMemo(
    () => (transactionData ? calculateActionSummaries(transactionData.transactions) : []),
    [transactionData]
  );

  const handleSymbolClick = (symbol: string) => {
    setSymbolFilter(symbol);
    setActiveTab('all');
  };

  const handleDataLoaded = (data: TransactionFile) => {
    setTransactionData(data);
    setSymbolFilter(null);
  };

  const tabTriggerClass =
    "h-7 rounded-md text-[11px] text-indigo-200/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white";

  return (
    <div className="min-h-screen w-full bg-[#0b0e1f] p-4 font-sans text-slate-100">
      <div className="mx-auto max-w-[1800px] space-y-5">
        <div className="rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] p-4 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300/70">
                Brokerage Activity
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-slate-50">Transactions</h1>
              <p className="text-xs text-slate-400">
                Upload a brokerage export to review fills, fees, and symbol-level activity.
              </p>
            </div>
            <JsonUploader onDataLoaded={handleDataLoaded} className="w-full max-w-xl" />
          </div>
        </div>

        {transactionData && summary && (
          <>
            <TransactionSummaryCards summary={summary} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid h-9 w-full max-w-lg grid-cols-3 rounded-lg border border-indigo-500/15 bg-[#14172c] p-1">
                <TabsTrigger value="all" className={tabTriggerClass}>
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="symbols" className={tabTriggerClass}>
                  By Symbol
                </TabsTrigger>
                <TabsTrigger value="actions" className={tabTriggerClass}>
                  By Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <TransactionTable
                  data={transactionData.transactions}
                  symbolFilter={symbolFilter}
                  onSymbolFilterChange={setSymbolFilter}
                />
              </TabsContent>

              <TabsContent value="symbols" className="space-y-4">
                <SymbolSummaryTable data={symbolSummaries} onSymbolClick={handleSymbolClick} />
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <ActionSummaryTable data={actionSummaries} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {!transactionData && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-indigo-500/20 py-24">
            <div className="space-y-3 text-center">
              <p className="text-sm text-slate-200">No transaction data loaded</p>
              <p className="text-xs text-slate-400">
                Upload a JSON file from your brokerage to get started
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

Note: `ActionSummaryTable`'s `onActionClick` prop is optional and now omitted — that is intentional (the type dropdown handles type filtering). Leave the prop in the component (used for its internal click affordance) but the page no longer drives it.

- [ ] **Step 3: Verify**

Run: `npm run lint` then `npm run build`
Expected: both pass. No references to `actionFilters`, `selectedActionFilters`, `onActionTypeClick`, or `clearFilters` remain.

- [ ] **Step 4: Manual check**

Run `npm run dev`, open `/transactions`, upload a brokerage JSON. Confirm: three stat cards show; Type dropdown multi-selects and filters the table; selecting a row's symbol in By Symbol jumps to the Transactions tab with the Symbol dropdown set.

- [ ] **Step 5: Commit**

```bash
git add "components/ui/(transactions)/TransactionSummaryCards.tsx" "app/transactions/page.tsx"
git commit -m "feat(transactions): 3-stat summary + page rewire to controlled symbol filter"
```

---

### Task D: Restyle By Symbol and By Action tables

**Files:**
- Modify: `components/ui/(transactions)/SymbolSummaryTable.tsx`
- Modify: `components/ui/(transactions)/ActionSummaryTable.tsx`

These are styling-only changes — do not change columns, totals, or props.

- [ ] **Step 1: SymbolSummaryTable — restyle Card and table chrome**

- Root `<Card>` className → `cn("w-full rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20 font-sans", className)`
- `<CardTitle>` className → `text-sm font-semibold tracking-tight text-slate-100` (text: "By Symbol")
- Search `<Input>` className → `h-9 w-[180px] border-indigo-500/20 bg-[#0f1226] text-xs text-slate-100 placeholder:text-slate-500`
- Search icon className → `text-indigo-300/60`
- Header `<TableRow>` → `border-indigo-500/15 bg-[#0f1226]`; header `<TableHead>` text → `text-indigo-300/70`
- Body `<TableRow>` → `cn("border-indigo-500/10 hover:bg-indigo-500/10", index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]")`
- Totals `<TableRow>` → `border-t-2 border-indigo-500/30 bg-indigo-500/10 font-semibold`
- Outer container border → `border-indigo-500/15`
- Footer count text → `text-slate-400`

- [ ] **Step 2: ActionSummaryTable — restyle Card, category tiles, and table chrome**

- Root `<Card>` className → `cn("w-full rounded-xl border border-indigo-500/15 bg-gradient-to-br from-[#1b1f3b] to-[#14172c] shadow-lg shadow-black/20 font-sans", className)`
- `<CardTitle>` className → `text-sm font-semibold tracking-tight text-slate-100` (text: "By Action Type")
- Category tile labels → `text-indigo-300/70`; tile value count → `text-slate-50`
- Header `<TableRow>` → `border-indigo-500/15 bg-[#0f1226]`; header `<TableHead>` text → `text-indigo-300/70`
- Body `<TableRow>` → `cn("border-indigo-500/10 hover:bg-indigo-500/10", index % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]")`
- Totals `<TableRow>` → `border-t-2 border-indigo-500/30 bg-indigo-500/10 font-semibold`
- Outer container border → `border-indigo-500/15`

Keep the existing `ActionBadge` category colors (blue/purple/emerald/red) — they read well on the dark surface.

- [ ] **Step 3: Verify**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add "components/ui/(transactions)/SymbolSummaryTable.tsx" "components/ui/(transactions)/ActionSummaryTable.tsx"
git commit -m "style(transactions): restyle By Symbol and By Action tables for Bold Dashboard"
```

---

### Task E: Restyle the drag-and-drop uploader

**Files:**
- Modify: `components/ui/(transactions)/JsonUploader.tsx`

Styling-only — do not change upload/parse/localStorage logic.

- [ ] **Step 1: Restyle the Card, dropzone, and states**

- Root `<Card>` className → `cn("w-full rounded-xl border border-indigo-500/15 bg-[#14172c] font-sans", className)`
- `<CardTitle>` className → `flex items-center gap-2 text-sm tracking-wide text-slate-100`
- Loaded state container → `flex items-center justify-between rounded-lg border border-teal-500/40 bg-teal-500/10 p-3`; check icon → `text-teal-300`; filename text → `text-slate-100`; "Loaded" text → `text-teal-300`
- Dropzone (idle) → `relative rounded-lg border border-dashed border-indigo-500/25 p-5 transition-colors hover:border-indigo-400/50`
- Dropzone (dragging) → `border-violet-400 bg-violet-500/10`
- Dropzone (error) → `border-red-500/50 bg-red-500/5`
- Upload icon wrap (idle) → `bg-indigo-500/15`; (dragging) → `bg-violet-500/20`
- Upload icon (idle) → `text-indigo-300/70`; (dragging) → `text-violet-300`
- Helper text "Drag JSON file" → `text-slate-100`; "or click to browse" → `text-slate-400`
- Error box → `border-red-500/40 bg-red-500/10`; error text → `text-red-300`

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add "components/ui/(transactions)/JsonUploader.tsx"
git commit -m "style(transactions): restyle JSON uploader for Bold Dashboard"
```

---

### Task F: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no new errors across the transactions files.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles successfully.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, open `/transactions`:
- Empty state renders on the dark shell.
- Drag-and-drop a brokerage JSON → data loads and persists across refresh.
- Three stat cards: Total Transactions, Total Fees (teal), Date Range (violet).
- Transactions tab: search filters; Type dropdown lets you check multiple types with a count badge and filters the table; Symbol dropdown filters; page-size switches; column sort works; pagination works; **no Export button**.
- By Symbol tab: clicking a symbol jumps to Transactions tab with that symbol pre-selected.
- By Action tab: renders with category tiles + table.

- [ ] **Step 4: Final commit (only if any fixes were made in this task)**

```bash
git add -A
git commit -m "fix(transactions): final redesign polish"
```

---

## Self-Review

**Spec coverage:**
- Drag-and-drop upload → Task E (logic preserved, restyled). ✓
- Transactions table → Tasks A/B. ✓
- Filtering + sorting → Task B (search, type, symbol) + existing column sort. ✓
- Filter by transaction types as a dropdown → Task A (filter fn) + Task B (multi-select `DropdownMenuCheckboxItem`). ✓
- No export → Task B (export button + function removed). ✓
- Stats: Total Transactions, Total Fees, Date Range only → Task C. ✓
- Keep By Symbol / By Action views → Task C (tabs) + Task D (restyle). ✓
- Bold Dashboard look → theme tokens applied in Tasks B–E. ✓

**Type consistency:** `multiIncludeFilter` (exported from `TransactionTableColumns.tsx`) is applied to the `action` column there; `TransactionTable` sets that column's filter value to `string[]`, matching the filter fn signature. `symbolFilter: string | null` / `onSymbolFilterChange: (value: string | null) => void` are consistent between `page.tsx` and `TransactionTable`. `TransactionSummaryCards` new props (`summary`, `className`) match the page's usage.

**Placeholder scan:** none — every code-bearing step includes full code or exact class strings.
