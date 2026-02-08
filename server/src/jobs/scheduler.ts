import cron from 'node-cron';
import { runEarningsSyncJob } from './earnings.job';

/**
 * Start all scheduled jobs.
 * Called once when the server starts.
 */
export function startScheduler(): void {
  // Daily earnings sync at 6:00 AM EST
  // Cron runs in the server's timezone — '0 6 * * *' for 6 AM.
  // If deployed in UTC, use '0 11 * * *' for 6 AM EST (UTC-5).
  // Adjust based on your deployment timezone.
  const earningsSchedule = '0 11 * * *'; // 11:00 UTC = 6:00 AM EST

  cron.schedule(earningsSchedule, async () => {
    console.log(`[scheduler] Triggering daily earnings sync at ${new Date().toISOString()}`);
    await runEarningsSyncJob();
  });

  console.log('[scheduler] Cron jobs registered:');
  console.log(`  - Earnings sync: daily at 6:00 AM EST (${earningsSchedule} UTC)`);
}
