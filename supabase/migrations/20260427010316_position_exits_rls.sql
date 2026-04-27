BEGIN;

-- Enable RLS on tblPositionExits to match the access posture of the parent
-- tblPortfolioPositions table. Without policies, no rows would be readable
-- through the API even though the table contains data.
ALTER TABLE public."tblPositionExits" ENABLE ROW LEVEL SECURITY;

-- Each policy joins through tblPortfolioPositions -> tblPortfolio to find the
-- owning user, since tblPositionExits doesn't directly carry a user_id.
CREATE POLICY "Users can read their own position exits"
  ON public."tblPositionExits"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public."tblPortfolioPositions" pp
      JOIN public."tblPortfolio" p ON p.portfolio_key = pp.portfolio_key
      WHERE pp.trade_key = position_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own position exits"
  ON public."tblPositionExits"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."tblPortfolioPositions" pp
      JOIN public."tblPortfolio" p ON p.portfolio_key = pp.portfolio_key
      WHERE pp.trade_key = position_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own position exits"
  ON public."tblPositionExits"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public."tblPortfolioPositions" pp
      JOIN public."tblPortfolio" p ON p.portfolio_key = pp.portfolio_key
      WHERE pp.trade_key = position_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own position exits"
  ON public."tblPositionExits"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public."tblPortfolioPositions" pp
      JOIN public."tblPortfolio" p ON p.portfolio_key = pp.portfolio_key
      WHERE pp.trade_key = position_id
        AND p.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
