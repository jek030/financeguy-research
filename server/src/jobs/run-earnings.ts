import dotenv from 'dotenv';
dotenv.config();

import { EarningsService } from '../services/earnings.service';
import { FMPProvider } from '../providers/fmp.provider';

/**
 * Standalone earnings sync runner.
 * Designed to be invoked directly (e.g. from GitHub Actions or CLI)
 * rather than from within a long-running server process.
 *
 * Usage:  npx tsx src/jobs/run-earnings.ts
 */
async function main() {
  const startTime = Date.now();
  console.log('[earnings-runner] Starting daily earnings sync...');

  const provider = new FMPProvider();
  const service = new EarningsService(provider);

  const result = await service.runFullSync();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[earnings-runner] Sync completed in ${elapsed}s — ` +
    `${result.calendarCount} calendar entries, ` +
    `${result.statementsCount} income statements for ` +
    `${result.symbolsSynced.length} symbols`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error('[earnings-runner] Fatal error:', err);
  process.exit(1);
});
