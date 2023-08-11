import cron from 'node-cron';
import { refreshDailyAnnClickData, rollupCurrentToDailyForAnnClickData } from './jobs/process_ann_click';
import { refreshDailyConversionData, rollupCurrentToDailyForConversionData } from './jobs/process_conversion';
import { refreshDailyMetricsData, rollupCurrentToDailyForMetricsData} from './jobs/process_metrics';
import { runCrawler } from './jobs/refresh_tour_usage_data';

export default async function mainScheduleLoop() {
  cron.schedule('0 */1 * * *', async () => {
    const isSuccess: boolean =  await runCrawler();
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