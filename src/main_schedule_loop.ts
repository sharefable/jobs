import cron from 'node-cron';
import { refreshDailyAnnClickData, rollupCurrentToDailyForAnnClickData } from './jobs/refresh_ann_click';
import { refreshDailyConversionData, rollupCurrentToDailyForConversionData } from './jobs/refresh_conversion';
import { refreshDailyMetricsData, rollupCurrentToDailyForMetricsData } from './jobs/refresh_metrics';
import { refreshCrawler } from './jobs/refresh_partitions';

export default async function mainScheduleLoop() {
  cron.schedule('0 */1 * * *', async () => {
    const isSuccess: boolean =  await refreshCrawler();
    if(isSuccess) {
      await Promise.all([
        refreshDailyAnnClickData(),
        refreshDailyConversionData(),
        refreshDailyMetricsData(),
      ]);
    }
  });

  // what time in mid day the job should be scheduled
  cron.schedule('0 0 * * *', async () => {
    await Promise.all([
      rollupCurrentToDailyForAnnClickData(),
      rollupCurrentToDailyForConversionData(),
      rollupCurrentToDailyForMetricsData(),
    ]);
  });
}