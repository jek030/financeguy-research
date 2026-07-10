BEGIN;

ALTER TABLE public."tblPortfolioPositions"
  ADD COLUMN IF NOT EXISTS instrument text NOT NULL DEFAULT 'stock';

DO $$ BEGIN
  ALTER TABLE public."tblPortfolioPositions"
    ADD CONSTRAINT tblPortfolioPositions_instrument_check
    CHECK (instrument IN ('stock', 'option'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Existing option symbols from brokerage imports typically include spaces
-- e.g. "MU 04/17/2026 470.00 C"
UPDATE public."tblPortfolioPositions"
SET instrument = 'option'
WHERE instrument = 'stock'
  AND symbol LIKE '% %';

COMMIT;
