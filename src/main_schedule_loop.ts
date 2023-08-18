import { rollupCurrentToDailyForAnnClickData } from './jobs/annclick/rollup';
import { rollupCurrentToDailyForConversionData } from './jobs/conversion/rollup';
import { rollupCurrentToDailyForMetricsData } from './jobs/metrics/rollup';
import { refreshDailyAnnClickData } from './jobs/annclick/refresh_daily';
import { refreshDailyConversionData } from './jobs/conversion/refresh_daily';
import { refreshDailyMetricsData } from './jobs/metrics/refresh_daily';
import { refreshPartition } from './jobs/refresh_partitions';
import cron from 'node-cron';
import { sentryFailure, sentryProgress, sentrySuccess } from './sentry';

export default async function mainScheduleLoop() {
  cron.schedule('*/5 * * * *', async () => {
    const jobName = 'daily-job';
    const checkInId = sentryProgress(jobName);
    try {
      const isSuccess: boolean = await refreshPartition(); 
      if(isSuccess) {
        await Promise.all([
          refreshDailyAnnClickData(),
          refreshDailyConversionData(),
          refreshDailyMetricsData(),
        ]);
      } 
      sentrySuccess(checkInId, jobName);
    } catch (error) {
      sentryFailure(checkInId, jobName);
    }
  });

  //what time in mid day the job should be scheduled

  cron.schedule('*/5 * * * *', async () => {
    const jobName = 'roll-up';
    const checkInId = sentryProgress(jobName);
    try {
      await Promise.all([
        rollupCurrentToDailyForAnnClickData(),
        rollupCurrentToDailyForConversionData(),
        rollupCurrentToDailyForMetricsData(),
      ]);
      sentrySuccess(checkInId, jobName);
    } catch (error) {
      sentryFailure(checkInId, jobName);
    }
  });
}
