import { rollupCurrentToDailyForAnnClickData } from './jobs/annclick/rollup';
import { rollupCurrentToDailyForConversionData } from './jobs/conversion/rollup';
import { rollupCurrentToDailyForMetricsData } from './jobs/metrics/rollup';
import { refreshDailyAnnClickData } from './jobs/annclick/refresh_daily';
import { refreshDailyConversionData } from './jobs/conversion/refresh_daily';
import { refreshDailyMetricsData } from './jobs/metrics/refresh_daily';
import { refreshPartition } from './jobs/refresh_partitions';
import cron from 'node-cron';
import { sentryProgress, sentrySuccess } from './sentry';

export default async function mainScheduleLoop() {
  cron.schedule('*/5 * * * *', async () => {
    const checkInId = sentryProgress();
    console.log('CheckId: ', checkInId);
    const isSuccess: boolean = await refreshPartition(); 
    if(isSuccess) {
      await Promise.all([
        refreshDailyAnnClickData(),
        refreshDailyConversionData(),
        refreshDailyMetricsData(),
      ]);
    } 
    sentrySuccess(checkInId);
  });

  //what time in mid day the job should be scheduled

  cron.schedule('0 0 * * *', async () => {
    const checkInId = sentryProgress();
    await Promise.all([
      rollupCurrentToDailyForAnnClickData(),
      rollupCurrentToDailyForConversionData(),
      rollupCurrentToDailyForMetricsData(),
    ]);
    sentrySuccess(checkInId);
  });
}
