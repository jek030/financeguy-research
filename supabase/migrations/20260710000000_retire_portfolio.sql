BEGIN;

ALTER TABLE public."tblPortfolio"
  ADD COLUMN IF NOT EXISTS is_retired boolean NOT NULL DEFAULT false;

COMMIT;
