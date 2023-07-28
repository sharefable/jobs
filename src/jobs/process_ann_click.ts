import { 
  JobTimestampInfo, 
  AthenaEntityForAnnTourClick,
  AnalyticsEntityForAnnTourClick,
  Count,
  AnalyticViews,
  AggregatedViewsAndDate,
  TableName,
  AggregatedValues} from '../types';
import { getCurrentTypeForTourIdAnnIdAndYmd, 
  insertQueryForNewEntry,  
  performDeleteQueryOfDataWithTypeDailyForTourIdAnnId, 
  queryToCheckIfLifeTimeExist, 
  queryToFindAverageForAllDailyType, 
  queryToFindSumofViewsForTourIdAndAnnId, 
  queryToGetCountOfDailyForAnnIdAndTourId, 
  queryToGetLifeTimeValueOfAnn, 
  queryToInsertLifeTimeDataForAnnTourClick, 
  queryToUpdateLifeTimeValueOfTourIdAnnId, 
  updateEntryTypeForAnnClickTour, 
  updateEntryTypeIfQueryResultNotExist, 
  updateViewsForAnnClickTour } from './ann_click_queries';
import { calculateAverage, 
  calculateDateNintyDaysBefore, 
  executeAppropriateSqlQueryFoFetchData, 
  executeAppropriateSqlQueryToInsertOrUpdateData,  
  executeSqlQueryToOnlyReturnArrays,  
  getYmdFromJobTimestampInfo } from '../utils';
import { queryToFetchCurrentTypeForYmd } from './conversion_queries';
import { EntryDurationType } from 'api-contract';
  
export const processAthenaQueryResultToAnnClicks = async (
  queryResults: AthenaEntityForAnnTourClick[], timestampInfo: JobTimestampInfo) => {
  if (queryResults === undefined || queryResults.length === 0) {
    await updateEntryTypeInAnnTourClickWhenQueryResultsIsEmpty(timestampInfo);
  } else {
    const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
    for (const queryResult of queryResults) {
      const annTourClickData: AnalyticsEntityForAnnTourClick = await getAnnTourClickDataForId(queryResult);
      if (annTourClickData !== undefined) {
        await updateViewsOrViewsAndTypeWhenQueryResultsIsNotEmpty(queryResult, annTourClickData, currentYmdOfJob);
      } else {
        await updateOrInsertLifeTimeAndNewEntry(queryResult, currentYmdOfJob);
      }
    }
  }
};

const updateEntryTypeInAnnTourClickWhenQueryResultsIsEmpty = async (timestampInfo: JobTimestampInfo) => {
  const lastSuccessfulYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.lastSuccessfulRunAt);
  const query = queryToFetchCurrentTypeForYmd(lastSuccessfulYmdOfJob, TableName.AnalyticTourAnnClicks);
  const currentTypeDataForYmd: AnalyticsEntityForAnnTourClick[] = await executeSqlQueryToOnlyReturnArrays(query);
  if (currentTypeDataForYmd.length !== 0 && currentTypeDataForYmd !== undefined) {
    for (const currentTypeData of currentTypeDataForYmd) {
      const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
      if (currentTypeData.date_ymd !== currentYmdOfJob) {
        await updateEntryTypeIfQueryResultNotExist(currentTypeData);
      }
    }
  }
};

const getAnnTourClickDataForId = async (queryResult: AthenaEntityForAnnTourClick) => {
  const queryToGetAnnTourClickData = getCurrentTypeForTourIdAnnIdAndYmd(queryResult);
  const annTourClickDataForId: AnalyticsEntityForAnnTourClick = await executeAppropriateSqlQueryFoFetchData(queryToGetAnnTourClickData);
  return annTourClickDataForId;
};

const getDailyTypeCountForId = async (queryResult: AthenaEntityForAnnTourClick) => {
  const countDailyForAnnIdAndTourId = queryToGetCountOfDailyForAnnIdAndTourId(queryResult.payload_tour_id, queryResult.payload_ann_id);
  const dailyCountOfAnnId: Count = await executeAppropriateSqlQueryFoFetchData(countDailyForAnnIdAndTourId);
  return dailyCountOfAnnId;
};

const newEntryInAnnTouClicksWithAppropriateType = async (queryResult: AthenaEntityForAnnTourClick, currentJobYmd: number) => {
  if (parseInt(queryResult.ymd) === currentJobYmd) {
    await insertQueryForNewEntry(queryResult, EntryDurationType.CURRENT);
  } else {
    await insertQueryForNewEntry(queryResult, EntryDurationType.DAILY);
  }
};

const updateViewsOrViewsAndTypeWhenQueryResultsIsNotEmpty = async(queryResult: AthenaEntityForAnnTourClick,
  resultOfParticularAnnId: AnalyticsEntityForAnnTourClick, 
  currentYmdOfJob: number ) => {
  const addedViewsAll = parseInt(queryResult.views_all) + resultOfParticularAnnId.views_all;
  const addedUniqueViews = parseInt(queryResult.views_unique) + resultOfParticularAnnId.views_unique;
  const averageTimeSpent = findAverage(queryResult.time_spent_dist,resultOfParticularAnnId.time_spent_dist);
  const queryYmd = parseInt(queryResult.ymd);
  if (queryYmd === currentYmdOfJob) {
    const queryToUpdateViews = updateViewsForAnnClickTour(queryResult.payload_tour_id, 
      queryResult.payload_ann_id,
      addedViewsAll,  
      addedUniqueViews,
      averageTimeSpent,
      queryYmd, 
    );
    await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateViews);
  } else {
    const queryToUpdateEntryType = updateEntryTypeForAnnClickTour(queryResult.payload_tour_id, 
      queryResult.payload_ann_id,
      addedViewsAll, 
      addedUniqueViews, 
      averageTimeSpent,
      queryYmd);
    await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateEntryType);
  }
};

const updateOrInsertLifeTimeAndNewEntry = async (queryResult: AthenaEntityForAnnTourClick, currentYmdOfJob: number) => {
  const dailyCountForId: Count = await getDailyTypeCountForId(queryResult);
  if (dailyCountForId !== undefined && dailyCountForId.count === 90) {
    const checkLifetimeExist = await queryToCheckIfLifeTimeExist(queryResult.payload_tour_id, queryResult.payload_ann_id);
    if (checkLifetimeExist.value === 1) {
      await performeQueriesIfTourIdHasLifeTimeValue(queryResult);
    } else {
      await performeQueriesIfTourIdDoNotHasLifeTimeValue(queryResult);
    }
  }
  await newEntryInAnnTouClicksWithAppropriateType(queryResult, currentYmdOfJob);
};

const performeQueriesIfTourIdHasLifeTimeValue = async (queryResult: AthenaEntityForAnnTourClick) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfAnn(queryResult.payload_tour_id, queryResult.payload_ann_id);
  const lifeTimeValue: AthenaEntityForAnnTourClick = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
   
  const nientyDaysValues: AggregatedViewsAndDate = await aggregatedNientyDaysViewsAndDate(queryResult);
  const addedViewsAll = parseInt(lifeTimeValue.views_all) + nientyDaysValues.aggregatedViews.sum_views_all;
  const addedViewsUnique = parseInt(lifeTimeValue.views_unique) + nientyDaysValues.aggregatedViews.sum_views_unique;
  const totalTimeSpent: string = findAverage(queryResult.time_spent_dist, lifeTimeValue.time_spent_dist);
  await performDeleteQueryOfDataWithTypeDailyForTourIdAnnId(queryResult.payload_tour_id, queryResult.payload_ann_id);
    
  const queryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourIdAnnId(queryResult.payload_tour_id,
    queryResult.payload_ann_id,
    addedViewsAll,
    addedViewsUnique, 
    totalTimeSpent, 
    nientyDaysValues.nientyDaysBeforeDate);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryForUpdatedLifeTime);
};

const performeQueriesIfTourIdDoNotHasLifeTimeValue = async (queryResult: AthenaEntityForAnnTourClick) => {
  const nientyDaysValues: AggregatedValues = await aggregatedNientyDaysViewsAndDate(queryResult);
  const insertQueryForLifeTime = queryToInsertLifeTimeDataForAnnTourClick(queryResult.payload_tour_id, 
    queryResult.payload_ann_id, 
    nientyDaysValues.aggregatedViews, 
    nientyDaysValues.avg_time_spent, 
    nientyDaysValues.nientyDaysBeforeDate,
  );
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
  await performDeleteQueryOfDataWithTypeDailyForTourIdAnnId(queryResult.payload_tour_id, queryResult.payload_ann_id);
};

const aggregatedNientyDaysViewsAndDate = async (queryResult: AthenaEntityForAnnTourClick) => {
  const nientyDaysViewsForTourId: AnalyticViews = await performQueryExecutionToFindSumOfViews(queryResult.payload_tour_id, queryResult.payload_ann_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const averageTimeSpent: string = await performQueryToGetAverageTotalTimeSpent(queryResult.payload_tour_id, queryResult.payload_ann_id);
  const totalTimeSpent: string = findAverage(queryResult.time_spent_dist, averageTimeSpent);
  const aggregationAndDate: AggregatedValues =  { nientyDaysBeforeDate: date, aggregatedViews: nientyDaysViewsForTourId, avg_time_spent: totalTimeSpent,
  };
  return aggregationAndDate;
};

const performQueryExecutionToFindSumOfViews = async (tour_id: number, ann_id: string) => {
  const queryToFindSumOfViews = queryToFindSumofViewsForTourIdAndAnnId(tour_id, ann_id);
  const views: AnalyticViews  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfViews);
  return views;
};

const performQueryToGetAverageTotalTimeSpent = async (tour_id: number, ann_id: string) => {
  const queryToGetAvgOfTimespent = queryToFindAverageForAllDailyType(tour_id, ann_id);
  const average: AggregatedValues  = await executeAppropriateSqlQueryFoFetchData(queryToGetAvgOfTimespent);
  return average.avg_time_spent;
};

const findAverage = (queryTimeSpent: string, dbTimeSpent: string) => {
  const calAverage = JSON.stringify(calculateAverage(JSON.parse(queryTimeSpent),JSON.parse(dbTimeSpent)));
  return calAverage;
};