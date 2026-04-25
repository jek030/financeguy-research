BEGIN;

-- 1. New child table for exits
CREATE TABLE IF NOT EXISTS public."tblPositionExits" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id int8 NOT NULL REFERENCES public."tblPortfolioPositions"(trade_key) ON DELETE CASCADE,
  price numeric(18,6) NOT NULL,
  shares numeric(18,6) NOT NULL CHECK (shares >= 0),
  exit_date date NULL,
  notes text NULL,
  sort_order int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tblPositionExits_position_sort
  ON public."tblPositionExits" (position_id, sort_order);

-- 2. Backfill PT1 (price_target_1) into rows with sort_order = 0
INSERT INTO public."tblPositionExits" (position_id, price, shares, exit_date, sort_order)
SELECT
  trade_key,
  price_target_1,
  price_target_1_quantity,
  NULL,
  0
FROM public."tblPortfolioPositions"
WHERE price_target_1 > 0 AND price_target_1_quantity > 0;

-- 3. Backfill PT2 (price_target_2) into rows with sort_order = 1
INSERT INTO public."tblPositionExits" (position_id, price, shares, exit_date, sort_order)
SELECT
  trade_key,
  price_target_2,
  price_target_2_quantity,
  NULL,
  1
FROM public."tblPortfolioPositions"
WHERE price_target_2 > 0 AND price_target_2_quantity > 0;

-- 4. Backfill PT3 (the "21-day trail" final exit) into rows with sort_order = 2.
--    Shares = quantity - PT1 shares - PT2 shares. Only insert if remainder > 0.
INSERT INTO public."tblPositionExits" (position_id, price, shares, exit_date, sort_order)
SELECT
  trade_key,
  price_target_3,
  GREATEST(quantity - COALESCE(price_target_1_quantity, 0) - COALESCE(price_target_2_quantity, 0), 0),
  NULL,
  2
FROM public."tblPortfolioPositions"
WHERE price_target_3 > 0
  AND (quantity - COALESCE(price_target_1_quantity, 0) - COALESCE(price_target_2_quantity, 0)) > 0;

-- 5. For positions with a non-null close_date, stamp exit_date on the
--    highest-sort_order backfilled row. Open positions / trims keep NULL.
UPDATE public."tblPositionExits" e
SET exit_date = pp.close_date
FROM public."tblPortfolioPositions" pp
WHERE e.position_id = pp.trade_key
  AND pp.close_date IS NOT NULL
  AND e.sort_order = (
    SELECT MAX(sort_order)
    FROM public."tblPositionExits"
    WHERE position_id = pp.trade_key
  );

-- 6. Drop legacy columns from tblPortfolioPositions
ALTER TABLE public."tblPortfolioPositions"
  DROP COLUMN price_target_1,
  DROP COLUMN price_target_1_quantity,
  DROP COLUMN price_target_2,
  DROP COLUMN price_target_2_quantity,
  DROP COLUMN price_target_3,
  DROP COLUMN remaining_shares;

COMMIT;
