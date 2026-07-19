BEGIN;

ALTER TABLE public."tblPortfolioPositions"
  ADD COLUMN IF NOT EXISTS fee double precision NOT NULL DEFAULT 0;

ALTER TABLE public."tblPositionExits"
  ADD COLUMN IF NOT EXISTS fee numeric(18,6) NOT NULL DEFAULT 0;

COMMIT;
