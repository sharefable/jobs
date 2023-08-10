import { 
  JobTimestampInfo, 
  AthenaEntityForAnnTourClick,
  AnalyticsEntityForAnnTourClick, 
  TableName} from '../types';
import { getCurrentTypeForTourIdAnnIdAndYmd,
  newRowWithCurrentType, 
  updateEntryTypeToDaily, 
  updateViewsForAnnClickTour } from './ann_click_queries';
import { calculateAverage,   
  getCurrentAndUpdateAt,   
  getJobTimestampInfo, 
  getPreviousDate, 
  getTimeFromUpdatedAt} from '../utils';
import { EntryDurationType, JobType } from '../api-contract';
import { createJob, queryToGetPrevDateData } from './jobs';
import { randomUUID } from 'crypto';
import { getAthenaResponse } from './athena';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from './mysql';

/* TODO: we need to handle in case of hourly job gets failed at one point 
   and not able to change the entry type to CURRENT to DAILY */

export const refreshDailyAnnClickData = async () => {
  const annClickJobKey = randomUUID();
  const annClickJobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(annClickJobStartedAt);
  const markAsInProgress = await createJob(JobType.REFRESH_TOUR_ANN_CLICK, annClickJobKey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  const athenaResultForAnnClick: AthenaEntityForAnnTourClick[] = await getAthenaResponse(
    JobType.ATHENA_QUERY_ANN_CLICK, 
    JobType.REFRESH_TOUR_ANN_CLICK,
  ) as AthenaEntityForAnnTourClick[];
  try {
    for (const queryResult of athenaResultForAnnClick) {
      const annTourClickData: AnalyticsEntityForAnnTourClick[] = await getAnnTourClickData(queryResult);
      const customCurrentAndUpdatedAt: string = getCurrentAndUpdateAt(timestampInfo.currentRanFor);
      if (annTourClickData.length === 1) {
        await updateViews(queryResult, annTourClickData.at(0) as AnalyticsEntityForAnnTourClick, customCurrentAndUpdatedAt);
      } else {
        await newRowWithCurrentType(queryResult, EntryDurationType.CURRENT, customCurrentAndUpdatedAt);
      }
    }
    await success('Ann Click Job is successful');
  } catch (err: any) {
    await failure(err.message);
  }
};

const getAnnTourClickData = async (queryResult: AthenaEntityForAnnTourClick) : 
Promise<AnalyticsEntityForAnnTourClick[]> => {
  const queryToGetAnnTourClickData = getCurrentTypeForTourIdAnnIdAndYmd(queryResult);
  try {
    const annTourClickDataForId: AnalyticsEntityForAnnTourClick[] = 
          await executeQueryToFetchData(queryToGetAnnTourClickData);
    return annTourClickDataForId;
  } catch (err: any) {
    throw new Error(err.message);
  }
};

const updateViews = async(queryResult: AthenaEntityForAnnTourClick,
  resultOfParticularAnnId: AnalyticsEntityForAnnTourClick,
  currentAndUpdatedAt: string,
) => {
  try {
    const addedViewsAll = parseInt(queryResult.views_all) + resultOfParticularAnnId.views_all;
    const addedUniqueViews = parseInt(queryResult.views_unique) + resultOfParticularAnnId.views_unique;
    const averageTimeSpent = findAverage(queryResult.time_spent_dist,resultOfParticularAnnId.time_spent_dist);
    const queryYmd = parseInt(queryResult.ymd);
    const queryToUpdateViews = updateViewsForAnnClickTour(queryResult.payload_tour_id, 
      queryResult.payload_ann_id,
      addedViewsAll,  
      addedUniqueViews,
      averageTimeSpent,
      queryYmd, 
      currentAndUpdatedAt,
    );
    await executeQueryToInsertOrUpdateData(queryToUpdateViews);
  } catch (err: any) {
    throw new Error(err.message);
  }
};

const findAverage = (queryTimeSpent: string, dbTimeSpent: string) => {
  const average = JSON.stringify(calculateAverage(JSON.parse(queryTimeSpent),JSON.parse(dbTimeSpent)));
  return average;
};

export const rollupCurrentToDailyForAnnClickData = async () => {
  const rollupAnnclickJobkey = randomUUID();
  const rollupAnnclickJobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(rollupAnnclickJobStartedAt);
  const markAsInProgress = await createJob(JobType.ROLLUP_ANN_CLICK_CURRENT_TO_DAILY, rollupAnnclickJobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const prevYmd: string = getPreviousDate(rollupAnnclickJobStartedAt);
    const query = queryToGetPrevDateData(prevYmd, TableName.AnalyticTourAnnClicks);
    const annClicks: AnalyticsEntityForAnnTourClick[] = await executeQueryToFetchData(query);
    for (const annClick of annClicks) {
      const timePortion = getTimeFromUpdatedAt(annClick.updated_at);
      if (timePortion === '23:59:59') {
        const queryToUpdateEntyType = updateEntryTypeToDaily(annClick);
        await executeQueryToInsertOrUpdateData(queryToUpdateEntyType);
        await success('Rollup for Ann Click Successful');
      } else {
        await failure('Rollup for Ann Click Failed, Time did not match with 23:59:59');
      }
    }
  } catch (err: any) {
    await failure(err.message);
  }
};