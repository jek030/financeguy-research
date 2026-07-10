# Retire Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users retire/un-retire a portfolio so it stays viewable but blocks add/edit/delete of positions (portfolio page + transactions Add to Portfolio modal).

**Architecture:** Add `is_retired` on `tblPortfolio`, expose `setPortfolioRetired` + mutation guards in `usePortfolio`, then gate UI on the portfolio toolbar/positions tab and disable retired options in the transactions modal dropdown.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase (`tblPortfolio`), shadcn Dialog/Select/Button, Tailwind.

**Testing:** No automated test runner is configured. Each task ends with **manual verification** (and `npm run lint` where noted) before committing.

**Spec:** `docs/superpowers/specs/2026-07-09-retire-portfolio-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `supabase/migrations/YYYYMMDDHHMMSS_retire_portfolio.sql` | Add `is_retired` column |
| `lib/supabase.ts` | Extend `SupabasePortfolio` with `is_retired` |
| `hooks/usePortfolio.ts` | Normalize flag, `setPortfolioRetired`, guard mutations |
| `app/portfolio/page.tsx` | Toolbar Retire/Un-retire, dropdown badge, lock Add/Edit/Delete |
| `components/ui/(transactions)/AddToPortfolioModal.tsx` | Grey + disable retired portfolios in select |

---

### Task 1: Database migration + type

**Files:**
- Create: `supabase/migrations/20260710000000_retire_portfolio.sql`
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add migration**

Create `supabase/migrations/20260710000000_retire_portfolio.sql`:

```sql
BEGIN;

ALTER TABLE public."tblPortfolio"
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;

COMMIT;
```

Apply this migration to the linked Supabase project before relying on the column in the app (Supabase MCP/CLI or dashboard SQL editor).

- [ ] **Step 2: Extend TypeScript type**

In `lib/supabase.ts`, update `SupabasePortfolio`:

```ts
export interface SupabasePortfolio {
  portfolio_key: number | string;
  created_at: string;
  user_id: string;
  user_email: string;
  portfolio_value: number;
  portfolio_name: string;
  is_retired?: boolean;
}
```

- [ ] **Step 3: Manual verification**

Confirm the column exists in Supabase (`tblPortfolio.is_retired`, default `false`). Existing rows should read as not retired.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260710000000_retire_portfolio.sql lib/supabase.ts
git commit -m "feat(portfolio): add is_retired column and type"
```

---

### Task 2: Hook — normalize, set retired, mutation guards

**Files:**
- Modify: `hooks/usePortfolio.ts`

- [ ] **Step 1: Add helper near top of file (after imports / normalize helpers)**

```ts
const isPortfolioRetired = (p: { is_retired?: boolean } | null | undefined): boolean =>
  Boolean(p?.is_retired);

const assertPortfolioMutable = (p: { is_retired?: boolean } | null | undefined) => {
  if (!p) {
    throw new Error('No portfolio found');
  }
  if (isPortfolioRetired(p)) {
    throw new Error('This portfolio is retired. Un-retire it to make changes.');
  }
};
```

- [ ] **Step 2: Normalize `is_retired` when mapping portfolio rows**

Wherever portfolios are set from Supabase (`fetchPortfolio`, `createPortfolio` success, etc.), ensure each row is stored with a boolean:

```ts
const normalized = {
  ...row,
  portfolio_key: normalizePortfolioKey(row.portfolio_key),
  is_retired: Boolean(row.is_retired),
};
```

Apply the same normalization to `setPortfolio` / `setPortfolios` updates so UI never sees `undefined` as a third state.

- [ ] **Step 3: Add `setPortfolioRetired`**

```ts
const setPortfolioRetired = async (retired: boolean) => {
  if (!portfolio) {
    throw new Error('No portfolio found');
  }

  const currentKey = normalizePortfolioKey(portfolio.portfolio_key);

  const { error } = await supabase
    .from('tblPortfolio')
    .update({ is_retired: retired })
    .eq('portfolio_key', portfolio.portfolio_key);

  if (error) {
    throw error;
  }

  setPortfolio((prev) => (prev ? { ...prev, is_retired: retired } : null));
  setPortfolios((prev) =>
    prev.map((item) =>
      normalizePortfolioKey(item.portfolio_key) === currentKey
        ? { ...item, is_retired: retired }
        : item,
    ),
  );
};
```

- [ ] **Step 4: Guard position mutations**

At the start of each of these functions, call `assertPortfolioMutable(portfolio)` (after any existing `if (!portfolio)` checks, or replace them with the assert):

- `addPosition`
- `updatePosition`
- `deletePosition`
- `addExit`
- `updateExit`
- `deleteExit`

Do **not** guard `updatePortfolio`, `updatePortfolioValue`, `createPortfolio`, or `setPortfolioRetired`.

- [ ] **Step 5: Export new API**

Add to the hook return object:

```ts
setPortfolioRetired,
```

Consumers can derive retired state as `Boolean(portfolio?.is_retired)`.

- [ ] **Step 6: Manual verification**

In browser console / temporary UI call: retire via `setPortfolioRetired(true)`, then attempt `addPosition` and confirm it throws the retired error without writing. Call `setPortfolioRetired(false)` and confirm add works again.

- [ ] **Step 7: Commit**

```bash
git add hooks/usePortfolio.ts
git commit -m "feat(portfolio): add retire flag API and mutation guards"
```

---

### Task 3: Portfolio page — toolbar Retire/Un-retire + dropdown badge

**Files:**
- Modify: `app/portfolio/page.tsx`

- [ ] **Step 1: Wire hook API**

From `usePortfolio()`, also destructure `setPortfolioRetired`. Derive:

```ts
const isPortfolioRetired = Boolean(portfolio?.is_retired);
```

- [ ] **Step 2: Extend `PortfolioToolbarProps`**

Add:

```ts
isPortfolioRetired: boolean;
onRetireClick: () => void;
```

Pass them from the page into `PortfolioToolbar`.

- [ ] **Step 3: Update portfolio `SelectItem` rendering**

In the toolbar dropdown map, mute retired rows and show a badge, but keep them **selectable**:

```tsx
<SelectItem
  key={record.portfolio_key}
  value={String(record.portfolio_key)}
  className={cn(Boolean(record.is_retired) && 'text-muted-foreground')}
>
  <span className="flex items-center gap-2 min-w-0">
    <span className="truncate">
      {record.portfolio_name || `Portfolio ${record.portfolio_key}`}
    </span>
    {Boolean(record.is_retired) && (
      <span className="shrink-0 rounded border border-border/60 px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        Retired
      </span>
    )}
    {defaultPortfolioKey === Number(record.portfolio_key) && (
      <Star className="h-3 w-3 fill-amber-400 text-amber-400 flex-shrink-0" />
    )}
  </span>
</SelectItem>
```

Ensure `portfolios` typing includes `is_retired?: boolean` on the toolbar prop type.

- [ ] **Step 4: Add Retire / Un-retire button next to Edit Portfolio**

Use an archive-style icon if desired (`Archive` / `ArchiveRestore` from `lucide-react`). Label via tooltip:

- When not retired: tooltip **Retire Portfolio**, `onClick={onRetireClick}`
- When retired: tooltip **Un-retire Portfolio**, same handler (page decides confirm copy)

Show a small inline **Retired** badge in the toolbar when `isPortfolioRetired` is true.

- [ ] **Step 5: Add confirm dialogs on the page**

State:

```ts
const [showRetireDialog, setShowRetireDialog] = useState(false);
const [isTogglingRetired, setIsTogglingRetired] = useState(false);
```

`onRetireClick` / `handleRetireClick`:

```ts
const handleRetireClick = () => {
  setShowRetireDialog(true);
};
```

Dialog body:

- If currently active: title **Retire Portfolio**, description  
  `Retire this portfolio? You won’t be able to add, edit, or delete positions until you un-retire it. Stats and history remain available.`  
  Confirm button calls `await setPortfolioRetired(true)`.
- If currently retired: title **Un-retire Portfolio**, description  
  `Un-retire this portfolio and allow adding and editing positions again?`  
  Confirm button calls `await setPortfolioRetired(false)`.

On success: close dialog, clear any open edit-position modal if present (`setShowEditModal(false)`, `setEditingPosition(null)`).

- [ ] **Step 6: Manual verification**

1. Retire → badge appears; dropdown shows Retired label; Un-retire works.
2. Selecting a retired portfolio still works.
3. Lint: `npm run lint`

- [ ] **Step 7: Commit**

```bash
git add app/portfolio/page.tsx
git commit -m "feat(portfolio): add retire/un-retire toolbar controls"
```

---

### Task 4: Portfolio page — lock Add Position + table edit/delete

**Files:**
- Modify: `app/portfolio/page.tsx`

- [ ] **Step 1: Disable Add Position when retired**

In the Add Position sidebar section:

- Disable all inputs, selects, and the submit button when `isPortfolioRetired`.
- Show helper text under the section title: `This portfolio is retired.`
- Early-return at the top of `handleAddStock` if retired (belt-and-suspenders with hook guard).

- [ ] **Step 2: Hide/disable row Edit + Delete**

In the positions table actions cell, when `isPortfolioRetired`, do not render Edit/Delete buttons (or render them `disabled`). Chart/view actions may remain.

Also disable the delete confirmation path by no-oping `handleDeletePosition` when retired.

- [ ] **Step 3: Manual verification**

On a retired portfolio:

1. Cannot submit Add Position.
2. No edit/delete controls on rows.
3. Stats/Calendar/Backtest still load.
4. Edit Portfolio (name/value) still works.
5. Un-retire restores Add/Edit/Delete.
6. `npm run lint`

- [ ] **Step 4: Commit**

```bash
git add app/portfolio/page.tsx
git commit -m "feat(portfolio): lock position mutations when retired"
```

---

### Task 5: Transactions Add to Portfolio modal

**Files:**
- Modify: `components/ui/(transactions)/AddToPortfolioModal.tsx`

- [ ] **Step 1: Render retired options as disabled + badged**

Replace the portfolios map (~line 314) with:

```tsx
{portfolios.map((p) => {
  const retired = Boolean(p.is_retired);
  return (
    <SelectItem
      key={String(p.portfolio_key)}
      value={String(p.portfolio_key)}
      disabled={retired}
      className={cn(retired && 'text-muted-foreground')}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="truncate">{p.portfolio_name}</span>
        {retired && (
          <span className="shrink-0 rounded border border-border/60 px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            Retired
          </span>
        )}
      </span>
    </SelectItem>
  );
})}
```

Import `cn` from `@/lib/utils` if not already imported.

- [ ] **Step 2: Clear invalid selection**

When `open` and the current `selectedPortfolioKey` points at a retired portfolio, clear it and do not call `selectPortfolio` for that key:

```ts
useEffect(() => {
  if (!open) return;
  const selected = portfolios.find(
    (p) => String(p.portfolio_key) === selectedPortfolioKey,
  );
  if (selected && Boolean(selected.is_retired)) {
    setSelectedPortfolioKey('');
  }
}, [open, portfolios, selectedPortfolioKey]);
```

Also update the sync effect that auto-selects `portfolio` so it only auto-selects when `!Boolean(portfolio.is_retired)`.

- [ ] **Step 3: Block submit if target is retired**

Before `addPosition` / `addExit` in the submit handler, if `Boolean(portfolio?.is_retired)` (after selection), set `submitError` to `This portfolio is retired.` and return.

Disable the confirm button when there is no selectable (non-retired) portfolio selected.

- [ ] **Step 4: Manual verification**

1. Open Add to Portfolio with a retired portfolio in the list → row is greyed, badge shown, cannot select.
2. Active portfolios still import successfully.
3. If hook’s current portfolio is retired and modal opens, selection is cleared / user must pick an active one.
4. `npm run lint`

- [ ] **Step 5: Commit**

```bash
git add "components/ui/(transactions)/AddToPortfolioModal.tsx"
git commit -m "feat(transactions): disable retired portfolios in Add to Portfolio"
```

---

### Task 6: End-to-end verification + final commit if needed

- [ ] **Step 1: Full manual checklist (from spec)**

1. Retire current portfolio → Add Position disabled; edit/delete hidden; stats still load.
2. Un-retire → mutations restored.
3. Portfolio dropdown: Retired badge + muted styling; still selectable.
4. Transactions modal: retired visible, not selectable; active works.
5. Hook guard: add/update/delete while retired does not write.
6. Edit Portfolio name still works while retired.

- [ ] **Step 2: Lint + build**

```bash
npm run lint
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit any leftover fixes**

```bash
git add -A
git status
git commit -m "fix(portfolio): polish retire portfolio edge cases"
```

(Only if there are remaining changes.)

---

## Spec coverage check

| Spec requirement | Task |
|---|---|
| `is_retired` migration + type | Task 1 |
| `setPortfolioRetired` + normalize | Task 2 |
| Guard add/update/delete/exits | Task 2 |
| Allow updatePortfolio while retired | Task 2 (explicit non-guard) |
| Toolbar Retire/Un-retire + confirm | Task 3 |
| Dropdown grey + badge, still selectable | Task 3 |
| Lock Add Position + table edit/delete | Task 4 |
| Transactions modal visible, not selectable | Task 5 |
| Clear invalid modal selection | Task 5 |
| E2E verification | Task 6 |
