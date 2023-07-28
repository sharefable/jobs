import { AthenaQueryEntityForMetrics, 
  AnalyticTourMetrics, 
  AnalyticViews, 
  JobTimestampInfo, 
  Count, 
  AggregatedViewsAndDate, 
  AthenaQueryEntityForConversion,
  TableName,
  GenericAthenaResultType, 
  AthenaEntityForAnnTourClick} from '../types';
import { calculateDateNintyDaysBefore, 
  executeAppropriateSqlQueryFoFetchData, 
  executeAppropriateSqlQueryToInsertOrUpdateData, 
  getYmdFromJobTimestampInfo } from '../utils';
import { processAthenaQueryResultToConversion } from './process_conversion';
import { processAthenaQueryResultToAnnClicks } from './process_ann_click';
import { updateViews, 
  updateEntryType, 
  queryToFetchDataForTourIdAndDate,
  queryForTotalDailyRowsForTourId, 
  queryToCheckIfTourIdHasLifeTimeValue, 
  queryToGetLifeTimeValueOfTourId, 
  queryToUpdateLifeTimeValueOfTourId, 
  queryToInsertLifeTimeData, 
  queryToDeleteAllTheDailyEvents, 
  queryToFindSumofViewsForTourId,  
  queryToUpdateEntryTypeIfQueryResultIsNotPresent,
  insertQueryForNewRowWithType} from './metrics_queries';
import { queryToFetchCurrentTypeForYmd } from './conversion_queries';
import { EntryDurationType } from 'api-contract';


export const processAthenaQueryResultToDb = async <T extends GenericAthenaResultType>(
  athenaResults: T[], timestampInfo: JobTimestampInfo, tableName: string | undefined) => {
  switch (tableName) {
    case TableName.AnalyticsTourMetrics:
      await processAthenaQueryResultToMetrics(athenaResults as unknown as AthenaQueryEntityForMetrics[],timestampInfo);
      break;
    case TableName.AnalyticsConversion:
      await processAthenaQueryResultToConversion( athenaResults as unknown as AthenaQueryEntityForConversion[], timestampInfo);
      break;
    case TableName.AnalyticTourAnnClicks:
      await processAthenaQueryResultToAnnClicks( athenaResults as AthenaEntityForAnnTourClick[], timestampInfo);
    default:
      break;
  }
  
};
  
const processAthenaQueryResultToMetrics = async (queryResults: AthenaQueryEntityForMetrics[], timestampInfo: JobTimestampInfo ) => {
  if (queryResults === undefined || queryResults.length === 0) {
    await updateEntryTypeWhenQueryResultIsEmpty(timestampInfo);
  } else {
    const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
    for (const queryResult of queryResults) {
      const metricsData: AnalyticTourMetrics = await getTableDataForIdAndYmd(queryResult);
      if (metricsData !== undefined) {
        await updateViewsOrViewsAndTypeIfQueryResultNotEmpty(queryResult, metricsData, currentYmdOfJob);  
      } else {
        await updateOrInsertLifeTimeDataOrNewEntry(queryResult, currentYmdOfJob);
      }
    }
  }
};

const  updateEntryTypeWhenQueryResultIsEmpty = async (timestampInfo: JobTimestampInfo) => {
  const lastSuccessfulYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.lastSuccessfulRunAt);
  const query = queryToFetchCurrentTypeForYmd(lastSuccessfulYmdOfJob, TableName.AnalyticsTourMetrics);
  const currentTypeDataForYmd: AnalyticTourMetrics[] = await executeAppropriateSqlQueryFoFetchData(query);
  if (currentTypeDataForYmd.length !== 0 && currentTypeDataForYmd !== undefined) {
    for(const currentTypeData of currentTypeDataForYmd) {
      await updateTypeIfQueryIsEmpty(currentTypeData, timestampInfo);  
    }
  }
};

const getTableDataForIdAndYmd = async (queryResult: AthenaQueryEntityForMetrics) => {
  const queryYmd = parseInt(queryResult.ymd);
  const query = queryToFetchDataForTourIdAndDate(queryResult.payload_tour_id, queryYmd);
  const metricsTableDataForIdAndYmd: AnalyticTourMetrics = await executeAppropriateSqlQueryFoFetchData(query);
  return metricsTableDataForIdAndYmd;
};

const getDailyCountForTourId = async (tour_id: number) => {
  const queryToCountDailyTypeForTourId = queryForTotalDailyRowsForTourId(tour_id);
  const totalDailyTypeTourId: Count = await executeAppropriateSqlQueryFoFetchData(queryToCountDailyTypeForTourId);
  return totalDailyTypeTourId;
};

const newMetricsEntryWithAppropriateType = async (queryResult: AthenaQueryEntityForMetrics, currentYmdOfJob: number) => {
  const queryYmd = parseInt(queryResult.ymd);
  if (queryYmd === currentYmdOfJob) {
    await insertQueryForNewRowWithType(queryResult, EntryDurationType.CURRENT);
  } else {
    await insertQueryForNewRowWithType(queryResult, EntryDurationType.DAILY);
  }
};

const updateOrInsertLifeTimeDataOrNewEntry = async (queryResult: AthenaQueryEntityForMetrics, currentJobYmd: number) => {
  const dailyCountForTourId: Count = await getDailyCountForTourId(queryResult.payload_tour_id);
  if (dailyCountForTourId !== undefined && dailyCountForTourId.count === 90) {
    const isPresent = await queryToCheckIfTourIdHasLifeTimeValue(queryResult.payload_tour_id);
    if (isPresent.value === 1) {
      await performeQueriesIfTourIdHasLifeTimeValue(queryResult);
    } else {
      await performeQueriesIfTourIdDoNotHasLifeTimeValue(queryResult);
    }
  }
  await newMetricsEntryWithAppropriateType(queryResult, currentJobYmd);
};

const performeQueriesIfTourIdHasLifeTimeValue = async (queryResult: AthenaQueryEntityForMetrics) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfTourId(queryResult.payload_tour_id);
  const lifeTimeValue: AthenaQueryEntityForMetrics = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
 
  const nientyDaysValues: AggregatedViewsAndDate = await aggregatedNientyDaysViewsAndDate(queryResult);
  const addedViewsAll = parseInt(lifeTimeValue.views_all) + nientyDaysValues.aggregatedViews.sum_views_all;
  const addedViewsUnique = parseInt(lifeTimeValue.views_unique) + nientyDaysValues.aggregatedViews.sum_views_unique;
  await queryToDeleteAllTheDailyEvents(queryResult.payload_tour_id);
  
  const queryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourId(queryResult.payload_tour_id,
    addedViewsAll, addedViewsUnique, nientyDaysValues.nientyDaysBeforeDate);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryForUpdatedLifeTime);
};
  
const performeQueriesIfTourIdDoNotHasLifeTimeValue = async (queryResult: AthenaQueryEntityForMetrics) => {
  const nientyDaysValues: AggregatedViewsAndDate = await aggregatedNientyDaysViewsAndDate(queryResult);
  const insertQueryForLifeTime = queryToInsertLifeTimeData(queryResult.payload_tour_id, 
    nientyDaysValues.aggregatedViews, 
    nientyDaysValues.nientyDaysBeforeDate,
  );
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
  await queryToDeleteAllTheDailyEvents(queryResult.payload_tour_id);
};
  
const performQueryExecutionToFindSumOfViews = async (tour_id: number) => {
  const queryToFindSumOfViews = queryToFindSumofViewsForTourId(tour_id);
  const views: AnalyticViews  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfViews);
  return views;
};

const aggregatedNientyDaysViewsAndDate = async (queryResult: AthenaQueryEntityForMetrics) => {
  const nientyDaysViewsForTourId: AnalyticViews = await 
  performQueryExecutionToFindSumOfViews(queryResult.payload_tour_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const sumOfViewsAndDate: AggregatedViewsAndDate =  {nientyDaysBeforeDate: date, 
    aggregatedViews: nientyDaysViewsForTourId};
  return sumOfViewsAndDate;
};

const updateTypeIfQueryIsEmpty = async (dbDataForTourId: AnalyticTourMetrics, timestampInfo: JobTimestampInfo) =>{
  const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
  if (dbDataForTourId.date_ymd !== currentYmdOfJob) {
    const queryToUpdateEntryType = queryToUpdateEntryTypeIfQueryResultIsNotPresent(dbDataForTourId.tour_id);
    await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateEntryType);
  }
};
const updateViewsOrViewsAndTypeIfQueryResultNotEmpty = async (
  queryResult: AthenaQueryEntityForMetrics, 
  dbDataForTourId: AnalyticTourMetrics, 
  currentYmdOfJob: number,
) => {
  const addedViewsAll = parseInt(queryResult.views_all) + dbDataForTourId.views_all;
  const addedViewsUnique = parseInt(queryResult.views_unique) + dbDataForTourId.views_unique;
  const queryYmd = parseInt(queryResult.ymd);
  if (dbDataForTourId.date_ymd === currentYmdOfJob) {
    const queryToUpdateViews = updateViews(queryResult.payload_tour_id, addedViewsAll, addedViewsUnique, queryYmd);
    await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateViews);
  } else {
    const queryToUpdateEntryType = updateEntryType(queryResult.payload_tour_id, addedViewsAll, addedViewsUnique, queryYmd);
    await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateEntryType);
  }
};
