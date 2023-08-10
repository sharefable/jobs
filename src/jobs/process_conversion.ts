import { EntryDurationType, JobType } from 'api-contract';
import { AthenaQueryEntityForConversion, 
  JobTimestampInfo,
  AnalyticTourConversion, 
  TableName} from '../types';
import { getJobTimestampInfo,
  getCurrentAndUpdateAt,
  getTimeFromUpdatedAt,
  getPreviousDate} from '../utils';
import { newRowWithCurrentType, queryToFetchDataForTourIdDateAndBtnId,  
  updateClicks, 
  updateEntryTypeToDaily} from './conversion_queries';
import { randomUUID } from 'crypto';
import { createJob, queryToGetPrevDateData } from './jobs';
import { getAthenaResponse } from './athena';
import {  } from './ann_click_queries';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from './mysql';

export const refreshDailyConversionData = async () => {
  const conversionJobkey = randomUUID();
  const conversionJoStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(conversionJoStartedAt);
  const markAsInProgress = await createJob(JobType.REFRESH_TOUR_CONVERSION, conversionJobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const athenaResultForConversion: AthenaQueryEntityForConversion[] = await getAthenaResponse(
      JobType.ATHENA_QUERY_CONVERSION, 
      JobType.REFRESH_TOUR_CONVERSION,
    ) as AthenaQueryEntityForConversion[];
    const currentAndUpdatedAt: string = getCurrentAndUpdateAt(timestampInfo.currentRanFor);
    for(const queryResult of athenaResultForConversion) {
      const conversionData: AnalyticTourConversion[] = await getConversionDataForIdAndYmd(queryResult);
      if (conversionData.length === 1 ) {
        await updateClicksForConversion(queryResult, 
          conversionData.at(0) as AnalyticTourConversion, 
          currentAndUpdatedAt);
      } else {
        await newRowWithCurrentType(queryResult, EntryDurationType.CURRENT, currentAndUpdatedAt);
      }
    }
    await success('Coversion Job successful');
  } catch (err: any) {
    await failure(err.message);
  }
};

const updateClicksForConversion =  async (queryResult: AthenaQueryEntityForConversion, 
  conversionData: AnalyticTourConversion, 
  currentAndUpdatedAt: string,
) => {
  try {
    const addedClicks = parseInt(queryResult.clicks) + parseInt(conversionData.clicks);
    const queryToUpdateViews = updateClicks(addedClicks, queryResult, currentAndUpdatedAt);
    await executeQueryToInsertOrUpdateData(queryToUpdateViews);
  } catch (err: any) {
    throw new Error(err.message);
  }
};

const getConversionDataForIdAndYmd = async (queryResult: AthenaQueryEntityForConversion)
: Promise<AnalyticTourConversion[]> => {
  try {
    const query = queryToFetchDataForTourIdDateAndBtnId(queryResult);
    const conversionDataForIdandYmd: AnalyticTourConversion[] = await executeQueryToFetchData(query);
    return conversionDataForIdandYmd;
  } catch (err: any) {
    throw new Error(err.message);
  }
};

export const rollupCurrentToDailyForConversionData = async () => {
  const rollUpConversionJobkey = randomUUID();
  const rollUpConversionJobStartedAt: number = Date.now(); 
  const timestampInfo: JobTimestampInfo = getJobTimestampInfo(rollUpConversionJobStartedAt);
  const markAsInProgress = await createJob(JobType.ROLLUP_CONVERSION_CURRENT_TO_DAILY, rollUpConversionJobkey, timestampInfo);
  const [success, failure] = await markAsInProgress();
  try {
    const prevYmd: string = getPreviousDate(rollUpConversionJobStartedAt);
    const query = queryToGetPrevDateData(prevYmd, TableName.AnalyticsConversion);
    const conversions: AnalyticTourConversion[] = await executeQueryToFetchData(query);
    for (const conversion of conversions) {
      const timePortion = getTimeFromUpdatedAt(conversion.updated_at);
      if (timePortion === '23:59:59') {
        const queryToUpdateEntyType = updateEntryTypeToDaily(conversion);
        await executeQueryToInsertOrUpdateData(queryToUpdateEntyType);
        await success('Rollup for Conversion is Successful');
      } else {
        await failure('Rollup for Conversion Failed, Time did not match with 23:59:59');
      }
    }
  } catch (err: any) {
    await failure(err.message);
  }
};
