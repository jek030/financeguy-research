import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { EarningsService } from '../services/earnings.service';
import { FMPProvider } from '../providers/fmp.provider';
import { runEarningsSyncJob } from '../jobs/earnings.job';

const provider = new FMPProvider();
const earningsService = new EarningsService(provider);

export const earningsRouter = Router();

// ---------- Query params validation ----------

const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD'),
});

const incomeStatementQuerySchema = z.object({
  period: z.enum(['annual', 'quarter']),
});

// ---------- Routes ----------

/**
 * GET /api/earnings/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns earnings calendar data from the database.
 * Response shape matches the FMP API for frontend compatibility.
 */
earningsRouter.get('/calendar', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = calendarQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { from, to } = parsed.data;
    const data = await earningsService.getCalendar(from, to);

    // Return as a plain array to match the FMP API shape
    res.json(data);
  } catch (error) {
    console.error('[route] Error fetching earnings calendar:', error);
    res.status(500).json({ error: 'Failed to fetch earnings calendar data' });
  }
});

/**
 * GET /api/earnings/income-statement/:symbol?period=annual|quarter
 *
 * Returns income statement data from the database for a specific symbol.
 * Response shape matches the FMP API for frontend compatibility.
 */
earningsRouter.get('/income-statement/:symbol', async (req: Request, res: Response): Promise<void> => {
  try {
    const symbol = (req.params.symbol as string)?.toUpperCase();
    if (!symbol) {
      res.status(400).json({ error: 'Symbol is required' });
      return;
    }

    const parsed = incomeStatementQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { period } = parsed.data;
    const data = await earningsService.getIncomeStatements(symbol, period);

    // Return as a plain array to match the FMP API shape
    res.json(data);
  } catch (error) {
    console.error(`[route] Error fetching income statements for ${req.params.symbol}:`, error);
    res.status(500).json({ error: 'Failed to fetch income statement data' });
  }
});

/**
 * POST /api/earnings/sync
 *
 * Manually trigger the earnings sync job.
 * Useful for initial data population or on-demand refreshes.
 */
earningsRouter.post('/sync', async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log('[route] Manual earnings sync triggered');

    // Run the sync job (this can take a while)
    runEarningsSyncJob();

    res.json({
      message: 'Earnings sync job started',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[route] Error triggering earnings sync:', error);
    res.status(500).json({ error: 'Failed to trigger earnings sync' });
  }
});

/**
 * POST /api/earnings/backfill?from=YYYY-MM-DD
 *
 * Backfill the earnings_calendar table from a given date up to today.
 * Skips any (symbol, report_date) that already exists.
 * Runs in the background — returns immediately.
 */
earningsRouter.post('/backfill', async (req: Request, res: Response): Promise<void> => {
  try {
    const fromSchema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD'),
    });

    const parsed = fromSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters. Usage: POST /api/earnings/backfill?from=2026-01-01',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { from } = parsed.data;
    console.log(`[route] Backfill triggered from ${from}`);

    // Run in background so the request returns immediately
    earningsService.backfillCalendar(from).then((result) => {
      console.log(`[route] Backfill finished: ${result.inserted} inserted, ${result.skipped} skipped, ${result.chunks} chunks`);
    }).catch((err) => {
      console.error('[route] Backfill failed:', err);
    });

    res.json({
      message: `Backfill started from ${from}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[route] Error triggering backfill:', error);
    res.status(500).json({ error: 'Failed to trigger backfill' });
  }
});
