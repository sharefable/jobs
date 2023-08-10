import { AthenaQueryEntityForMetrics, 
  AnalyticTourMetrics, 
  JobTimestampInfo, 
  TableName} from '../types';
import { getCurrentAndUpdateAt, getJobTimestampInfo, getPreviousDate, getTimeFromUpdatedAt } from '../utils';
import { queryToFetchDataForTourIdAndDate,
  insertQueryForNewRowWithType,
  updateEntryTypeToDaily,
  updateViewsForMetrics} from './metrics_queries';
import { EntryDurationType, JobType } from 'api-contract';
import { randomUUID } from 'crypto';
import { createJob, queryToGetPrevDateData } from './jobs';
import { getAthenaResponse } from './athena';
import {  } from './ann_click_queries';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from './mysql';
  
export const refreshDailyMetricsData = async () => {
  const jobkey = randomUUID();
  const jobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(jobStartedAt);
  const markAsInProgress = await createJob(JobType.REFRESH_TOUR_METRICS, jobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const athenaResultForMetrics: AthenaQueryEntityForMetrics[] = await getAthenaResponse(
      JobType.ATHENA_QUERY_METRICS, 
      JobType.REFRESH_TOUR_METRICS,
    ) as AthenaQueryEntityForMetrics[];
    for (const queryResult of athenaResultForMetrics) {
      const metricsData: AnalyticTourMetrics[] = await getTableDataForIdAndYmd(queryResult);
      const currentAndUpdatedAt: string = getCurrentAndUpdateAt(timestampInfo.currentRanFor);
      if (metricsData.length === 1) {
        await updateViews(queryResult, metricsData.at(0) as AnalyticTourMetrics, currentAndUpdatedAt);  
      } else {
        await insertQueryForNewRowWithType(queryResult, EntryDurationType.CURRENT, currentAndUpdatedAt);
      }
    }
    await success('Job successfully completed for metrics');
  } catch (err: any) {
    await failure(err.message);
  }
};


const getTableDataForIdAndYmd = async (queryResult: AthenaQueryEntityForMetrics): Promise<AnalyticTourMetrics[]> => {
  try {
    const queryYmd = parseInt(queryResult.ymd);
    const query = queryToFetchDataForTourIdAndDate(queryResult.payload_tour_id, queryYmd);
    const metricsTableDataForIdAndYmd: AnalyticTourMetrics[] = await executeQueryToFetchData(query);
    return metricsTableDataForIdAndYmd;
  } catch (err: any) {
    throw new Error(err. message);
  }
};

const updateViews = async (
  queryResult: AthenaQueryEntityForMetrics, 
  dbDataForTourId: AnalyticTourMetrics,
  currentAndUpdatedAt: string,
) => {
  try {
    const addedViewsAll = parseInt(queryResult.views_all) + dbDataForTourId.views_all;
    const addedViewsUnique = parseInt(queryResult.views_unique) + dbDataForTourId.views_unique;
    const queryYmd = parseInt(queryResult.ymd);
    const queryToUpdateViews = updateViewsForMetrics(
      queryResult.payload_tour_id, 
      addedViewsAll, 
      addedViewsUnique, 
      queryYmd, 
      currentAndUpdatedAt);
    await executeQueryToInsertOrUpdateData(queryToUpdateViews);
  } catch (err: any) {
    throw new Error(err. message);
  }
};

export const rollupCurrentToDailyForMetricsData = async () => {
  const rollupMetricsJobkey = randomUUID();
  const rollupMetricsJobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(rollupMetricsJobStartedAt);
  const markAsInProgress = await createJob(JobType.ROLLUP_METRICS_CURRENT_TO_DAILY, rollupMetricsJobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const prevYmd: string = getPreviousDate(rollupMetricsJobStartedAt);
    const query = queryToGetPrevDateData(prevYmd, TableName.AnalyticsTourMetrics);
    const metricsResult: AnalyticTourMetrics[] = await executeQueryToFetchData(query);
    for (const metrics of metricsResult) {
      const timePortion = getTimeFromUpdatedAt(metrics.updated_at);
      if (timePortion === '23:59:59') {
        const queryToUpdateEntyType = updateEntryTypeToDaily(metrics);
        await executeQueryToInsertOrUpdateData(queryToUpdateEntyType);
        await success('Rollup for Metrics Successful');
      } else {
        await failure('Rollup for Metrics Failed, Time did not match with 23:59:59');
      }
    }
  } catch (err: any) {
    await failure(err.message);
  }
};