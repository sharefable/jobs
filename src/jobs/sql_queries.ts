import { AnalyticTourMetricsViews, EntityDurationType, AthenaQueryEntity } from '../types';
import { executeAppropriateSqlQueryFoFetchData } from './job_queries';

export const queryToFetchFromMetricsTable = (tour_id: number, ymd: number) => {
  const query = `SELECT * From analytics_tour_metrics where tour_id = ${tour_id} and date_ymd = ${ymd}`;
  return query;
};
  
export const queryToCountAllRowsForTourId = (tour_id: number) => {
  const query = `SELECT COUNT(*) AS tour_count FROM analytics_tour_metrics 
                 WHERE tour_id = ${tour_id} and entry_duration_type='${EntityDurationType.DAILY}'`;
  return query;
};
  
export const queryToFindSumofViewsForTourId = (tour_id: number) => {
  const query = `SELECT SUM(views_unique) AS sum_views_unique, SUM(views_all) AS 
                 sum_views_all FROM analytics_tour_metrics WHERE tour_id = ${tour_id} and
                 entry_duration_type='${EntityDurationType.DAILY}' GROUP BY tour_id`;
  return query;
};
  
export const queryToInsertLifeTimeData = (views: AnalyticTourMetricsViews, ymd: number, tour_id: number) => {
  const query = `INSERT INTO analytics_tour_metrics (created_at, updated_at, date_ymd, 
                 entry_duration_type,tour_id, views_unique, views_all) 
                 VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(),
                 ${ymd}, '${EntityDurationType.LIFETIME}',
                 ${tour_id},${views.sum_views_unique},${views.sum_views_all} )`;
  return query;
};

export const insertQuery = (entityData: AthenaQueryEntity) => {
  const query = `INSERT INTO analytics_tour_metrics (created_at,updated_at, date_ymd, 
                 entry_duration_type, tour_id, views_unique, views_all) 
                 VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 
                 ${entityData.ymd}, '${EntityDurationType.CURRENT}',
                 ${entityData.payload_tour_id},null,
                 ${entityData.views_all} )`;
  return query;
};
  
export const updateQuery = (views_all: number, tour_id: number, ymd: number) => {
  const query = `UPDATE analytics_tour_metrics SET views_all = ${views_all} 
                 WHERE date_ymd =${ymd} AND tour_id =${tour_id}`;
  return query;
};
  
export const updateQueryWithEntryType = (ymd: number, tour_id: number) => {
  const query = `UPDATE analytics_tour_metrics SET 
                 entry_duration_type = '${EntityDurationType.DAILY}' 
                 WHERE date_ymd=${ymd} AND tour_id=${tour_id}`;
  return query;
};
  
export const queryToDeleteAllTheDailyEvents = (tour_id: number) => {
  const query = `DELETE FROM analytics_tour_metrics WHERE tour_id = ${tour_id} AND 
                 entry_duration_type = '${EntityDurationType.DAILY}'`;
  return query;
};

export const queryToCheckIfTourIdHasLifeTimeValue = async (tour_id: number) => {
  const query = `SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS value
               FROM analytics_tour_metrics WHERE tour_id = ${tour_id}
               AND entry_duration_type = '${EntityDurationType.LIFETIME}'`;
  const check = await executeAppropriateSqlQueryFoFetchData(query);
  return check;
};

export const queryToGetLifeTimeValueOfTourId = (tour_id: number) => {
  const query = `SELECT *  FROM analytics_tour_metrics WHERE tour_id = ${tour_id} AND 
  entry_duration_type = '${EntityDurationType.LIFETIME}'`;
  return query;
};

export const queryToUpdateLifeTimeValueOfTourId = (tour_id: number, view_unique: number, views_all: number, date: number) => {
  const query = `UPDATE analytics_tour_metrics SET views_unique=${view_unique}, 
                 views_all=${views_all}, ymd=${date} WHERE tour_id = ${tour_id}`;
  return query;
};
  