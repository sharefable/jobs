import { AthenaQueryEntity, TourCount, AnalyticTourMetrics, AnalyticTourMetricsViews } from '../types';
import { calculateDateNintyDaysBefore } from '../utils';
import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from './job_queries';
import { queryToCountAllRowsForTourId, 
  queryToCheckIfTourIdHasLifeTimeValue, 
  queryToFetchFromMetricsTable, 
  updateQuery, 
  updateQueryWithEntryType, 
  insertQuery, 
  queryToGetLifeTimeValueOfTourId, 
  queryToUpdateLifeTimeValueOfTourId, 
  queryToInsertLifeTimeData, 
  queryToDeleteAllTheDailyEvents, 
  queryToFindSumofViewsForTourId } from './sql_queries';

export const sendDataToDB = async (athenaResults: AthenaQueryEntity[]) => {
  console.log('sendDataToDB I am here');
  athenaResults.map(async (queryResult: AthenaQueryEntity) =>{
    const queryToCountParticularTour = queryToCountAllRowsForTourId(queryResult.payload_tour_id);
    const countOfParticularTour: TourCount = await executeAppropriateSqlQueryFoFetchData(queryToCountParticularTour);
      
    if (countOfParticularTour.tour_count !== undefined && countOfParticularTour.tour_count === 90) {
      const isPresent = await queryToCheckIfTourIdHasLifeTimeValue(queryResult.payload_tour_id);
      if (isPresent.value === 1) {
        await performeQueryIfTourIdHasLifeTimeValue(queryResult);
      } else {
        await performeQueryIfTourIdDoNotHaveLifeTimeValue(queryResult);
      }
    } else {
      const query = queryToFetchFromMetricsTable(queryResult.payload_tour_id, queryResult.ymd);
      const tableDataForTourId: AnalyticTourMetrics = await executeAppropriateSqlQueryFoFetchData(query);
      if (tableDataForTourId !== undefined) {
        if (queryResult.h !== 23) {
          const addedViewAll = parseInt(queryResult.views_all) + tableDataForTourId.views_all;
          const querys = updateQuery(addedViewAll, queryResult.payload_tour_id, queryResult.ymd);
          await executeAppropriateSqlQueryToInsertOrUpdateData(querys);
        } else {
          const querys = updateQueryWithEntryType(queryResult.ymd,  queryResult.payload_tour_id);
          await executeAppropriateSqlQueryToInsertOrUpdateData(querys);
        }
      } else {
        const insert = insertQuery(queryResult);
        await executeAppropriateSqlQueryToInsertOrUpdateData(insert);
      }
    }
  });
};
  
const performeQueryIfTourIdHasLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const queryLifetimeValue = queryToGetLifeTimeValueOfTourId(queryResult.payload_tour_id);
  const lifeTimeValue: AthenaQueryEntity = await executeAppropriateSqlQueryFoFetchData(queryLifetimeValue);
  const dailyDataForNientyDays:AnalyticTourMetricsViews  = await performQueryEcexutionToFindSumOfViews(queryResult.payload_tour_id);
    
  const addedViewAll = lifeTimeValue.views_all + dailyDataForNientyDays.sum_views_all;
  const addedViewUnique = lifeTimeValue.views_unique + dailyDataForNientyDays.sum_views_unique;
  
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
  const insertQueryForUpdatedLifeTime = queryToUpdateLifeTimeValueOfTourId(queryResult.payload_tour_id, addedViewAll, addedViewUnique, date);
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForUpdatedLifeTime);
};
  
const performeQueryIfTourIdDoNotHaveLifeTimeValue = async (queryResult: AthenaQueryEntity) => {
  const views: AnalyticTourMetricsViews = await performQueryEcexutionToFindSumOfViews(queryResult.payload_tour_id);
  const date: number = calculateDateNintyDaysBefore(queryResult.ymd.toString());
    
  const insertQueryForLifeTime = queryToInsertLifeTimeData(views, date, queryResult.payload_tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertQueryForLifeTime);
    
  const deleteQuery = queryToDeleteAllTheDailyEvents(queryResult.payload_tour_id);
  await executeAppropriateSqlQueryToInsertOrUpdateData(deleteQuery);
    
  const insertCurrentEventQuery = insertQuery(queryResult);
  await executeAppropriateSqlQueryToInsertOrUpdateData(insertCurrentEventQuery);
};
  
const performQueryEcexutionToFindSumOfViews = async (tour_id: number) => {
  const queryToFindSumOfViews = queryToFindSumofViewsForTourId(tour_id);
  const views: AnalyticTourMetricsViews  = await executeAppropriateSqlQueryFoFetchData(queryToFindSumOfViews);
  return views;
};