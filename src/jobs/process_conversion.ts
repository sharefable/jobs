import { EntryDurationType } from 'api-contract';
import { AthenaQueryEntityForConversion, 
  JobTimestampInfo,  
  AggregatedClicksAndDate, 
  AnalyticTourConversionClicks, 
  AnalyticTourConversion,
  Count,
  TableName} from '../types';
import { getYmdFromJobTimestampInfo, 
  calculateDateNintyDaysBefore, 
  executeAppropriateSqlQueryFoFetchData, 
  executeAppropriateSqlQueryToInsertOrUpdateData, 
  executeSqlQueryToOnlyReturnArrays} from '../utils';
import { queryToCheckIfTourIdHasLifeTimeValueInConversion, 
  queryToCountDailyTypeForTourIdAndBtnId, 
  queryToDeleteAllTheDailyEventsConversion, 
  queryToFetchCurrentTypeForYmd, 
  queryToFetchDataForTourIdDateAndBtnId, 
  queryToFindSumofClicksForTourIdConversion, 
  queryToGetLifeTimeValueOfTourIdConversion, 
  queryToInsertLifeTimeDataConversion,  
  queryToInsertNewRowWithType, 
  queryToUpdateClicksIfAthenaResultExist,  
  queryToUpdateLifeTimeValueOfTourIdConversion,
  queryUpdateEntryTypeIfAthenaResultExist, 
  queryUpdateEntryTypeIfQueryResultExist} from './conversion_queries';


export const processAthenaQueryResultToConversion = async (
  queryResults: AthenaQueryEntityForConversion[], timestampInfo: JobTimestampInfo) => {
  if (queryResults === undefined || queryResults.length === 0) {
    await updateEntryTypeInConversionWhenQueryResultIsEmpty(timestampInfo);
  } else {
    const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
    for(const queryResult of queryResults) {
      const conversionData: AnalyticTourConversion = await getConversionDataForIdAndYmd(queryResult);
      if (conversionData !== undefined) {
        const addedClicks = parseInt(queryResult.clicks) + parseInt(conversionData.clicks);
        const queryYmd = parseInt(queryResult.ymd);
        if (queryYmd === currentYmdOfJob) {
          await updateClicksIfQueryResultExist(addedClicks, queryResult);
        } else {
          await updateEntryTypeIfQueryResultExist(addedClicks, queryResult);
        }
      } else {
        await processForLifeTimeDataAndNewInsert(queryResult, currentYmdOfJob);
      }
    }
  }
};

const  updateEntryTypeInConversionWhenQueryResultIsEmpty = async (timestampInfo: JobTimestampInfo) => {
  const lastSuccessfulYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.lastSuccessfulRunAt);
  const query = queryToFetchCurrentTypeForYmd(lastSuccessfulYmdOfJob, TableName.AnalyticsConversion);
  const currentTypeDataForYmd: AnalyticTourConversion[] = await executeSqlQueryToOnlyReturnArrays(query);
  if (currentTypeDataForYmd.length !== 0 && currentTypeDataForYmd !== undefined) {
    for(const currentTypeData of currentTypeDataForYmd) {
      await updateTypeForEachEntryWhenQueryIsEmpty(currentTypeData, timestampInfo);
    }
  }
};

const updateTypeForEachEntryWhenQueryIsEmpty = async (currentTypeData: AnalyticTourConversion, timestampInfo: JobTimestampInfo)  => {
  const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
  if (currentTypeData.date_ymd !== currentYmdOfJob) {
    await updateEntryTypeIfQueryResultNotExist(currentTypeData);
  }
};

const updateEntryTypeIfQueryResultNotExist = async (entityData: AnalyticTourConversion) => {
  const queryToUpdateEntryType = queryUpdateEntryTypeIfQueryResultExist(entityData);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateEntryType);
};

const getConversionDataForIdAndYmd = async (queryResult: AthenaQueryEntityForConversion) => {
  const query = queryToFetchDataForTourIdDateAndBtnId(queryResult);
  const conversionDataForIdandYmd: AnalyticTourConversion = await executeAppropriateSqlQueryFoFetchData(query);
  return conversionDataForIdandYmd;
};

const getDailyCountForTourIdAndBtnId = async (queryResult: AthenaQueryEntityForConversion) => {
  const queryToCountDailyTypeForTourId = queryToCountDailyTypeForTourIdAndBtnId(queryResult.payload_tour_id, queryResult.payload_btn_id);
  const totalDailyTypeForTourId: Count = await executeAppropriateSqlQueryFoFetchData(queryToCountDailyTypeForTourId);
  return totalDailyTypeForTourId;
};

const processForLifeTimeDataAndNewInsert = async(queryResult: AthenaQueryEntityForConversion, currentYmdOfJob:number) => {
  const dailyTypeCount: Count = await getDailyCountForTourIdAndBtnId(queryResult);
  if (dailyTypeCount !== undefined && dailyTypeCount.count === 90) {
    const isPresent = await queryToCheckIfTourIdHasLifeTimeValueInConversion(queryResult.payload_tour_id, queryResult.payload_btn_id);
    if (isPresent.value === 1) {
      await performQueriesIfTourIdHasLifeTimeValueInConversion(queryResult);
    } else {
      await performQueriesIfTourIdDoNotHasLifeTimeValueInConversion(queryResult);
    }
  }
  await newConversionEntryWithAppropriateType(queryResult, currentYmdOfJob);
};

const newConversionEntryWithAppropriateType = async ( queryResult: AthenaQueryEntityForConversion, currentJobYmd: number) => {
  const queryYmd = parseInt(queryResult.ymd);
  if(queryYmd === currentJobYmd) {
    await queryToInsertNewRowWithType(queryResult, EntryDurationType.CURRENT);
  } else {
    await queryToInsertNewRowWithType(queryResult, EntryDurationType.DAILY);
  }
};

const performQueriesIfTourIdHasLifeTimeValueInConversion = async (queryResult: AthenaQueryEntityForConversion) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfTourIdConversion(queryResult.payload_tour_id, queryResult.payload_btn_id);
  const lifeTimeValue: AnalyticTourConversion = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
   
  const nientyDaysValues: AggregatedClicksAndDate = await aggregatedNientyDaysClicksAndDate(queryResult);
  const addedClicks = parseInt(lifeTimeValue.clicks) + nientyDaysValues.aggregatedClicks.total_clicks;
  await queryToDeleteAllTheDailyEventsConversion(queryResult.payload_tour_id, queryResult.payload_btn_id);
    
  const queryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourIdConversion(
    queryResult.payload_tour_id, 
    queryResult.payload_btn_id,
    addedClicks, 
    nientyDaysValues.nientyDaysBeforeDate,
  );
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryForUpdatedLifeTime);
};
  
const performQueriesIfTourIdDoNotHasLifeTimeValueInConversion = async (queryResult: AthenaQueryEntityForConversion) => {
  const nientyDaysValues: AggregatedClicksAndDate = await aggregatedNientyDaysClicksAndDate(queryResult);
  const insertQueryForLifeTime = queryToInsertLifeTimeDataConversion( queryResult.payload_tour_id, 
    queryResult.payload_btn_id,
    nientyDaysValues.aggregatedClicks.total_clicks, 
    nientyDaysValues.nientyDaysBeforeDate, 
  );
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
  await queryToDeleteAllTheDailyEventsConversion(queryResult.payload_tour_id, queryResult.payload_btn_id);
};
  
const aggregatedNientyDaysClicksAndDate = async (queryResult: AthenaQueryEntityForConversion) => {
  const nientyDaysViewsForTourId = await performQueryToFindSumOfClicks(queryResult.payload_tour_id, queryResult.payload_btn_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const sumOfViewsAndDate: AggregatedClicksAndDate =  {nientyDaysBeforeDate: date, aggregatedClicks:nientyDaysViewsForTourId};
  return sumOfViewsAndDate;
};
  
const performQueryToFindSumOfClicks = async (tour_id: number, btn_id: string) => {
  const queryToFindSumOfClicks = queryToFindSumofClicksForTourIdConversion(tour_id, btn_id);
  const clicks: AnalyticTourConversionClicks  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfClicks);
  return clicks;
};
  
const updateClicksIfQueryResultExist = async (addedClicks: number, entityData: AthenaQueryEntityForConversion) => {
  const queryToUpdateViews = queryToUpdateClicksIfAthenaResultExist(addedClicks, entityData);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateViews);
};

const updateEntryTypeIfQueryResultExist = async (addedClicks: number, entityData: AthenaQueryEntityForConversion) => {
  const queryToUpdateEntryType = queryUpdateEntryTypeIfAthenaResultExist(addedClicks, entityData);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateEntryType);
};