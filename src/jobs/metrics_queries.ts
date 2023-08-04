import { EntryDurationType } from '../api-contract';
import { TableName, AnalyticViews, AthenaQueryEntityForMetrics } from '../types';
import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from '../utils';

export const queryToFetchDataForTourIdAndDate = (tour_id: number, ymd: number) => {
  const query = `SELECT * From ${TableName.AnalyticsTourMetrics} where tour_id = ${tour_id} 
                 and date_ymd = ${ymd} and entry_duration_type='${EntryDurationType.CURRENT}'`;
  return query;
};
  
export const queryForTotalDailyRowsForTourId = (tour_id: number) => {
  const query = `SELECT COUNT(*) AS count FROM ${TableName.AnalyticsTourMetrics} 
                   WHERE tour_id = ${tour_id} and entry_duration_type='${EntryDurationType.DAILY}'`;
  return query;
};

export const queryToFindSumofViewsForTourId = (tour_id: number) => {
  const query = `SELECT SUM(views_unique) AS sum_views_unique, SUM(views_all) AS 
                   sum_views_all FROM ${TableName.AnalyticsTourMetrics} WHERE tour_id = ${tour_id} and
                   entry_duration_type='${EntryDurationType.DAILY}' GROUP BY tour_id`;
  return query;
};

export const queryToInsertLifeTimeData = (tour_id: number, views: AnalyticViews, ymd: number) => {
  const query = `INSERT INTO ${TableName.AnalyticsTourMetrics} (created_at, updated_at, date_ymd, 
                   entry_duration_type,tour_id, views_unique, views_all) 
                   VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(),
                   ${ymd}, '${EntryDurationType.LIFETIME}',
                   ${tour_id},${views.sum_views_unique},${views.sum_views_all} )`;
  return query;
};
  
export const insertQueryForNewRowWithType =  async (entityData: AthenaQueryEntityForMetrics, type: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsTourMetrics} (created_at,updated_at, date_ymd, 
                   entry_duration_type, tour_id, views_unique, views_all) 
                   VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 
                   ${entityData.ymd}, '${type}',
                   ${entityData.payload_tour_id}, ${entityData.views_unique},
                   ${entityData.views_all} )`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

export const updateViews = ( tour_id: number, views_all: number, views_unique: number, ymd: number) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET views_all = ${views_all}, views_unique = ${views_unique}
                 WHERE date_ymd =${ymd} AND tour_id =${tour_id}`;
  return query;
};
    
export const updateEntryType = (tour_id: number, views_all: number, views_unique: number, ymd: number) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET 
                 entry_duration_type = '${EntryDurationType.DAILY}', views_all = ${views_all}, 
                 views_unique = ${views_unique} WHERE date_ymd=${ymd} AND tour_id=${tour_id}`;
  return query;
};

export const queryToDeleteAllTheDailyEvents = async (tour_id: number) => {
  const query = `DELETE FROM ${TableName.AnalyticsTourMetrics} WHERE tour_id = ${tour_id} AND 
                   entry_duration_type = '${EntryDurationType.DAILY}'`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

export const queryToCheckIfTourIdHasLifeTimeValue = async (tour_id: number) => {
  const query = `SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS value
                 FROM ${TableName.AnalyticsTourMetrics} WHERE tour_id = ${tour_id}
                 AND entry_duration_type = '${EntryDurationType.LIFETIME}'`;
  const check = await executeAppropriateSqlQueryFoFetchData(query, 0);
  return check;
};

export const queryToGetLifeTimeValueOfTourId = (tour_id: number) => {
  const query = `SELECT *  FROM ${TableName.AnalyticsTourMetrics} WHERE tour_id = ${tour_id} AND 
                   entry_duration_type = '${EntryDurationType.LIFETIME}'`;
  return query;
};

export const queryToUpdateLifeTimeValueOfTourId = (
  tour_id: number, 
  views_all: number, 
  view_unique: number, 
  date: number) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET views_unique=${view_unique}, 
                   views_all=${views_all}, date_ymd=${date} WHERE tour_id = ${tour_id}
                   AND entry_duration_type='${EntryDurationType.LIFETIME}'`;
  return query;
};

export const queryToUpdateEntryTypeIfQueryResultIsNotPresent = (tour_id: number) =>{
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET  entry_duration_type='${EntryDurationType.DAILY}'
                 WHERE tour_id = ${tour_id}`;
  return query;
};