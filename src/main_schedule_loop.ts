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


export async function runHouerlyJobForUserAssign() {
  const jobName = 'hourly-job-user-assign';
  const checkInId = sentryProgress(jobName);
  let isSuccessForAnnUserAssign = false; 
  try {
    isSuccessForAnnUserAssign = await refreshPartitionForUserAssign();
    if (isSuccessForAnnUserAssign) {
      await refreshHourlyUserAidMapping();
      await refreshHourlyLeadActivity();
    } 
    sentrySuccess(checkInId, jobName);
  } catch (err) {
    log.err('#runHouerlyJobForUserAssign', (err as Error).stack);
    captureException(err as Error);
  }
}

export async function runHouerlyJob() {
  const jobName = 'hourly-job';
  const checkInId = sentryProgress(jobName);
  let isSuccessForAnnBtnClick = false; 
  try {
    isSuccessForAnnBtnClick = await refreshPartitionForAnnBtnClick();
    if(isSuccessForAnnBtnClick) {
      await Promise.all([
        refreshHourlyAnnClickData(),
        refreshHourlyConversionData(),
        refreshHourlyMetricsData(),
      ]);
    }
    sentrySuccess(checkInId, jobName);
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
      runHouerlyJob(),
      runHouerlyJobForUserAssign(),
    ]);
  });

  cron.schedule('0 15 * * * ', async () => {
    await runRollup();
  });
}
