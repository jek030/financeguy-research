import { EarningsService } from '../services/earnings.service';
import { FMPProvider } from '../providers/fmp.provider';

const provider = new FMPProvider();
const earningsService = new EarningsService(provider);

/**
 * Daily earnings sync job.
 *
 * - Fetches the earnings calendar (7 days back, 90 days forward)
 * - Upserts all entries into the database
 * - For companies that reported in the last 7 days, fetches their income statements
 * - Upserts income statement data
 */
export async function runEarningsSyncJob(): Promise<void> {
  const startTime = Date.now();
  console.log('[earnings-job] Starting daily earnings sync...');

  try {
    const result = await earningsService.runFullSync();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[earnings-job] Sync completed in ${elapsed}s — ` +
      `${result.calendarCount} calendar entries, ` +
      `${result.statementsCount} income statements for ` +
      `${result.symbolsSynced.length} symbols`
    );
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[earnings-job] Sync failed after ${elapsed}s:`, error);
  }
}
