import { AthenaQueryEntity, TourCount, AnalyticTourMetrics, AnalyticTourMetricsViews } from '../types';
import { calculateDateNintyDaysBefore } from '../utils';
import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from './job_queries';
import { queryToCountDailyRowsForTourId, 
  queryToCheckIfTourIdHasLifeTimeValue, 
  queryToFetchDataFromMetricsTableForTourIdAndDate, 
  updateQuery, 
  updateQueryWithEntryType, 
  insertQueryForNewRowWithTypeCurrent, 
  queryToGetLifeTimeValueOfTourId, 
  queryToUpdateLifeTimeValueOfTourId, 
  queryToInsertLifeTimeData, 
  queryToDeleteAllTheDailyEvents, 
  queryToFindSumofViewsForTourId } from './sql_queries';

export const processAthenaQueryResultToDb = async (athenaResults: AthenaQueryEntity[]) => {
  athenaResults.map(async (queryResult: AthenaQueryEntity) =>{
    const queryToCountDailyTypeForParticularTour = queryToCountDailyRowsForTourId(queryResult.payload_tour_id);
    const rowCountOfDailyForParticularTour: TourCount = await executeAppropriateSqlQueryFoFetchData(queryToCountDailyTypeForParticularTour);
    if (rowCountOfDailyForParticularTour.tour_count !== undefined && rowCountOfDailyForParticularTour.tour_count === 90) {
      const isPresent = await queryToCheckIfTourIdHasLifeTimeValue(queryResult.payload_tour_id);
      if (isPresent.value === 1) {
        await performeQueryIfTourIdHasLifeTimeValue(queryResult);
      } else {
        await performeQueryIfTourIdDoNotHaveLifeTimeValue(queryResult);
      }
    } else {
      const query = queryToFetchDataFromMetricsTableForTourIdAndDate(queryResult.payload_tour_id, queryResult.ymd);
      const tableDataForTourId: AnalyticTourMetrics = await executeAppropriateSqlQueryFoFetchData(query);
      if (tableDataForTourId !== undefined) {
        if (queryResult.h !== 23) {
          console.log('hour is lesser than 0');
          const addedViewAll = queryResult.views_all + tableDataForTourId.views_all;
          console.log('comined added value for current', queryResult.views_all, ' ',tableDataForTourId.views_all);
          const queryToUpdateViews = updateQuery(addedViewAll, queryResult.payload_tour_id, queryResult.ymd);
          await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdateViews);
        } else {
          console.log('hour is  equal TO 0 so CHANEGED TO DAILY');
          const queryToUpdate = updateQueryWithEntryType(queryResult.ymd,  queryResult.payload_tour_id);
          await executeAppropriateSqlQueryToInsertOrUpdateData(queryToUpdate);
        }
      } else {
        console.log('normal insert');
        const queryToInsertNewCurrentRow = insertQueryForNewRowWithTypeCurrent(queryResult);
        await executeAppropriateSqlQueryToInsertOrUpdateData(queryToInsertNewCurrentRow);
      }
    }
  });
};
  
const performeQueryIfTourIdHasLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfTourId(queryResult.payload_tour_id);
  const lifeTimeValue: AthenaQueryEntity = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
  const aggregatedDailyDataForNientyDays:AnalyticTourMetricsViews  = await performQueryEcexutionToFindSumOfViews(queryResult.payload_tour_id);
    
  const addedViewAll = lifeTimeValue.views_all + aggregatedDailyDataForNientyDays.sum_views_all;
  const addedViewUnique = lifeTimeValue.views_unique + aggregatedDailyDataForNientyDays.sum_views_unique;
  
  const deleteQuery = queryToDeleteAllTheDailyEvents(queryResult.payload_tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(deleteQuery);
  
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const queryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourId(queryResult.payload_tour_id, addedViewAll, addedViewUnique, date);
  await executeAppropriateSqlQueryToInsertOrUpdateData(queryForUpdatedLifeTime);
};
  
const performeQueryIfTourIdDoNotHaveLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const views: AnalyticTourMetricsViews = await performQueryEcexutionToFindSumOfViews(queryResult.payload_tour_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
    
  const insertQueryForLifeTime = queryToInsertLifeTimeData(views, date, queryResult.payload_tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
    
  const deleteQuery = queryToDeleteAllTheDailyEvents(queryResult.payload_tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(deleteQuery);
    
  const insertCurrentEventQuery = insertQueryForNewRowWithTypeCurrent(queryResult);
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertCurrentEventQuery);
};
  
const performQueryEcexutionToFindSumOfViews = async (tour_id: number) => {
  const queryToFindSumOfViews = queryToFindSumofViewsForTourId(tour_id);
  const views: AnalyticTourMetricsViews  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfViews);
  return views;
};