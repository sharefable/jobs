import cron from 'node-cron';
import refreshTourUsageData from './jobs/refresh_tour_usage_data';

export default function mainScheduleLoop() {
  cron.schedule('* * * * *', () => {
    console.log('running a task every second');
    refreshTourUsageData();
  });
  //refreshTourUsageData();
}
