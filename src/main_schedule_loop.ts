import { rollupCurrentToDailyForAnnClickData } from './jobs/annclick/rollup';
import { rollupCurrentToDailyForConversionData } from './jobs/conversion/rollup';
import { rollupCurrentToDailyForMetricsData } from './jobs/metrics/rollup';
import { refreshHourlyAnnClickData } from './jobs/annclick/refresh_hourly';
import { refreshHourlyConversionData } from './jobs/conversion/refresh_hourly';
import { refreshHourlyMetricsData } from './jobs/metrics/refresh_hourly';
import { refreshPartitionForAnnBtnClick,  refreshPartitionForUserAssign} from './jobs/refresh_partitions';
import cron from 'node-cron';
import { sentryProgress, sentrySuccess } from './sentry';
import {captureException} from '@sentry/node';
import * as log from './log';
import { refreshHourlyUserAidMapping } from './jobs/user_mapping/refresh_hourly';
import { refreshHourlyLeadActivity } from './jobs/lead_activity/refresh_hourly';


const jobNameForAnalytics = 'hourly-job';
const jobNameForUserAidMapping = 'hourly-job-user-assign';

export async function refreshHourlyJobForUserAssign(
  isCrawlerSuccess: boolean,
  sentryCheckInId: string ): Promise<boolean> {
  
  let userIdMapingStatus = false;
  try {
    if (isCrawlerSuccess) {
      userIdMapingStatus = await refreshHourlyUserAidMapping();
    }

    sentrySuccess(sentryCheckInId, jobNameForUserAidMapping);
    return userIdMapingStatus;
  } catch (err) {
    log.err('#runHouerlyJobForUserAssign', (err as Error).stack);
    captureException(err as Error);
    return false;
  }
}

export async function refreshCrawlerHourly() {
  return await Promise.all([
    refreshPartitionForAnnBtnClick(),
    refreshPartitionForUserAssign(),
  ]);
}

export async function mainHourlyJob () {
  const checkInIdForAnalytics = sentryProgress(jobNameForAnalytics);
  const checkInIdUserAidMapping = sentryProgress(jobNameForUserAidMapping);

  try {
    const[isSuccessForAnnBtnClick, isSuccessForAnnUserAssign] = await refreshCrawlerHourly();

    const [userIdMapingStatus] = await Promise.all([
      refreshHourlyJobForUserAssign(isSuccessForAnnUserAssign, checkInIdUserAidMapping),
      runHouerlyJob(isSuccessForAnnBtnClick, checkInIdForAnalytics),
    ]);

    if (isSuccessForAnnBtnClick && userIdMapingStatus) {
      await refreshHourlyLeadActivity();
    } else {
      log.warn('Any one of the crawler did not successfully run, so #REFRESH_LEAD_ACTIVITY did not run');
    }
  } catch (err) {
    log.err('#mainHourlyJob', (err as Error).stack);
    captureException(err as Error);
  }
}
export async function runHouerlyJob(isCrawlerSuccess: boolean, sentryCheckInId: string) {
  try {
    if (isCrawlerSuccess) {
      await Promise.all([
        refreshHourlyAnnClickData(),
        refreshHourlyConversionData(),
        refreshHourlyMetricsData(),
      ]);
    }
    sentrySuccess(sentryCheckInId, jobNameForAnalytics);
  } catch (err) {
    log.err('#runHouerlyJob', (err as Error).stack);
    captureException(err as Error);
  }
}

async function runRollup() {
  const jobName = 'roll-up';
  const checkInId = sentryProgress(jobName);
  try {
    await Promise.all([
      rollupCurrentToDailyForAnnClickData(),
      rollupCurrentToDailyForConversionData(),
      rollupCurrentToDailyForMetricsData(),
    ]);
    sentrySuccess(checkInId, jobName);
  } catch (err) {
    log.err('#runRollup', (err as Error).stack);
    captureException(err as Error);
  }
}

export default async function mainScheduleLoop() {
  cron.schedule('15 * * * * ', async () => {
    await Promise.all([
      mainHourlyJob(),
    ]);
  });

  cron.schedule('0 15 * * * ', async () => {
    await runRollup();
  });
}
