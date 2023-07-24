import { AthenaQueryEntity, 
  AnalyticTourMetrics, 
  AnalyticTourMetricsViews, 
  JobTimestampInfo, 
  TourCount, 
  AggregatedViewsAndDate } from '../types';
import { calculateDateNintyDaysBefore, getYmdFromJobTimestampInfo } from '../utils';
import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from './job_queries';
import { queryForTotalDailyRowsForTourId, 
  queryToCheckIfTourIdHasLifeTimeValue, 
  queryToFetchDataForTourIdAndDate, 
  updateViews, 
  updateEntryType, 
  insertQueryForNewRowWithTypeCurrent, 
  queryToGetLifeTimeValueOfTourId, 
  queryToUpdateLifeTimeValueOfTourId, 
  queryToInsertLifeTimeData, 
  queryToDeleteAllTheDailyEvents, 
  queryToFindSumofViewsForTourId } from './sql_queries';

export const processAthenaQueryResultToDb = async (athenaResults: AthenaQueryEntity[], timestampInfo: JobTimestampInfo) => {
  athenaResults.map( async (queryResult: AthenaQueryEntity) =>{
    const query = queryToFetchDataForTourIdAndDate(queryResult.payload_tour_id, queryResult.ymd);
    const dbDataForTourId: AnalyticTourMetrics = await executeAppropriateSqlQueryFoFetchData(query);
    if (dbDataForTourId !== undefined) {
      const currentYmdOfJob = getYmdFromJobTimestampInfo(timestampInfo.currentRunAt);
      const addedViewsAll = parseInt(queryResult.views_all) + dbDataForTourId.views_all;
      if (queryResult.ymd == currentYmdOfJob) {
        const queryToUpdateViews = updateViews(addedViewsAll, queryResult.payload_tour_id, queryResult.ymd);
        await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateViews);
      } else {
        const queryToUpdate = updateEntryType(queryResult.ymd,  queryResult.payload_tour_id, addedViewsAll);
        await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdate);
      }
    } else {
      const queryToCountDailyTypeForParticularTour = queryForTotalDailyRowsForTourId(queryResult.payload_tour_id);
      const totalDailyTypeForParticularTourId: TourCount = await executeAppropriateSqlQueryFoFetchData(queryToCountDailyTypeForParticularTour);
      if (totalDailyTypeForParticularTourId !== undefined && totalDailyTypeForParticularTourId.tour_count === 90) {
        const isPresent = await queryToCheckIfTourIdHasLifeTimeValue(queryResult.payload_tour_id);
        if (isPresent.value === 1) {
          await performeQueriesIfTourIdHasLifeTimeValue(queryResult);
        } else {
          await performeQueriesIfTourIdDoNotHasLifeTimeValue(queryResult);
        }
      }
      const queryToInsertNewCurrentRow = insertQueryForNewRowWithTypeCurrent(queryResult);
      await executeAppropriateSqlQueryToInsertOrUpdateData(queryToInsertNewCurrentRow);
    }
  });
};
  
const performeQueriesIfTourIdHasLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfTourId(queryResult.payload_tour_id);
  const lifeTimeValue: AthenaQueryEntity = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
 
  const nientyDaysValues: AggregatedViewsAndDate = await aggregatedNientyDaysViewsAndDate(queryResult);
  const addedViewsAll = lifeTimeValue.views_all + nientyDaysValues.aggregatedViews.sum_views_all;
  const addedViewsUnique = lifeTimeValue.views_unique + nientyDaysValues.aggregatedViews.sum_views_unique;
  performDeleteQueryOFDataWithTypeDailyForTourId(queryResult.payload_tour_id);
  
  const queryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourId(queryResult.payload_tour_id, addedViewsUnique, addedViewsAll, nientyDaysValues.nientyDaysBeforeDate);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryForUpdatedLifeTime);
};
  
const performeQueriesIfTourIdDoNotHasLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const nientyDaysValues: AggregatedViewsAndDate = await aggregatedNientyDaysViewsAndDate(queryResult);
  const insertQueryForLifeTime = queryToInsertLifeTimeData(nientyDaysValues.aggregatedViews, nientyDaysValues.nientyDaysBeforeDate, queryResult.payload_tour_id);
  
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
  performDeleteQueryOFDataWithTypeDailyForTourId(queryResult.payload_tour_id);
};
  
const performDeleteQueryOFDataWithTypeDailyForTourId = async (tour_id: number) => {
  const deleteQuery = queryToDeleteAllTheDailyEvents(tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(deleteQuery);
};

const performQueryEcexutionToFindSumOfViews = async (tour_id: number) => {
  const queryToFindSumOfViews = queryToFindSumofViewsForTourId(tour_id);
  const views: AnalyticTourMetricsViews  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfViews);
  return views;
};

const aggregatedNientyDaysViewsAndDate = async (queryResult: AthenaQueryEntity) => {
  const nientyDaysViewsForTourId: AnalyticTourMetricsViews = await performQueryEcexutionToFindSumOfViews(queryResult.payload_tour_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const sumOfViewsAndDate: AggregatedViewsAndDate =  {nientyDaysBeforeDate: date, aggregatedViews: nientyDaysViewsForTourId};
  return sumOfViewsAndDate;
};