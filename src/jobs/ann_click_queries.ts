import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from '../utils';
import { EntryDurationType } from '../api-contract';
import { AnalyticViews, AnalyticsEntityForAnnTourClick, AthenaEntityForAnnTourClick, TableName } from '../types';

export const getCurrentTypeForTourIdAnnIdAndYmd = (queryEntity: AthenaEntityForAnnTourClick) => {
  const query = `SELECT * FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = 
                  ${queryEntity.payload_tour_id} AND ann_id ='${queryEntity.payload_ann_id}'
                  AND entry_duration_type='${EntryDurationType.CURRENT}'`;
  return query;
};

export const updateViewsForAnnClickTour = (tour_id: number, 
  ann_id: string, 
  addedViewsAll: number,
  addedViewsUnique: number,
  timeSpentDist: string,
  ymd: number ) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET views_all = ${addedViewsAll},
                 views_unique=${addedViewsUnique},time_spent_dist='${timeSpentDist}'
                 WHERE date_ymd =${ymd} AND tour_id =${tour_id} AND ann_id ='${ann_id}'`;
  return query;
};

export const updateEntryTypeForAnnClickTour = ( tour_id: number, 
  ann_id: string, 
  addedViewsAll: number, 
  addedViewsUnique: number, 
  timeSpentDist: string,
  ymd: number) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET entry_duration_type = '${EntryDurationType.DAILY}', 
                 views_all = ${addedViewsAll}, views_unique=${addedViewsUnique}, time_spent_dist='${timeSpentDist}' 
                 WHERE date_ymd =${ymd} AND tour_id =${tour_id} AND ann_id ='${ann_id}'`;
  return query;
};

export const queryToGetCountOfDailyForAnnIdAndTourId = (tour_id: number, ann_id: string) => {
  const query = `SELECT COUNT(*) AS count FROM ${TableName.AnalyticTourAnnClicks} WHERE entry_duration_type = 
                   '${EntryDurationType.DAILY}' AND tour_id =${tour_id} AND ann_id ='${ann_id}'`;
  return query;
};

export const queryToCheckIfLifeTimeExist = async (tour_id: number, ann_id: string) => {
  const query = `SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS value
               FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = ${tour_id}
               AND ann_id = '${ann_id}' AND entry_duration_type = '${EntryDurationType.LIFETIME}'`;
  const check = await executeAppropriateSqlQueryFoFetchData(query);
  return check;
};

export const queryToGetLifeTimeValueOfAnn = (tour_id: number, ann_id: string) => {
  const query = `SELECT * FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = 
                 ${tour_id} AND ann_id ='${ann_id}' AND entry_duration_type='${EntryDurationType.LIFETIME}'`;
  return query;
};

export const queryToFindSumofViewsForTourIdAndAnnId = (tour_id: number, ann_id: string) => {
  const query = `SELECT SUM(views_all) as sum_views_all, SUM(views_unique) as sum_views_unique 
                FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = ${tour_id} 
                AND ann_id ='${ann_id}' AND entry_duration_type='${EntryDurationType.DAILY}'`;
  return query;
};

export const performDeleteQueryOfDataWithTypeDailyForTourIdAnnId = async (tour_id: number, ann_id: string) => {
  const query = `DELETE FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = ${tour_id} AND ann_id='${ann_id}'
                 AND entry_duration_type = '${EntryDurationType.DAILY}'`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

export const queryToUpdateLifeTimeValueOfTourIdAnnId = (tour_id: number, 
  ann_id: string, 
  addedViewsAll: number, 
  addedUniqueViews: number, 
  addedTimeSpent: string, 
  ymd: number) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET views_all = ${addedViewsAll}, 
                 views_unique = ${addedUniqueViews}, time_spent_dist='${addedTimeSpent}' WHERE date_ymd=${ymd} AND 
                 tour_id =${tour_id} AND ann_id ='${ann_id}'`;
  return query;
};

export const queryToInsertLifeTimeDataForAnnTourClick = (tour_id: number, 
  ann_id: string, 
  addedViews: AnalyticViews,
  addedTimeSpent: string, 
  ymd: number) => {
  const query = `INSERT INTO ${TableName.AnalyticTourAnnClicks} (created_at, updated_at, date_ymd, 
                   entry_duration_type, tour_id, ann_id, views_all, views_unique, time_spent_dist) 
                   VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(),${ymd},'${EntryDurationType.LIFETIME}',
                  ${tour_id},'${ann_id}',${addedViews.sum_views_all},${addedViews.sum_views_unique},
                 '${addedTimeSpent}')`;
  return query;
};

export const insertQueryForNewEntry =  async (entityData: AthenaEntityForAnnTourClick, type :string) => {
  const query = `INSERT INTO ${TableName.AnalyticTourAnnClicks} (created_at, updated_at, date_ymd, 
                 entry_duration_type, tour_id, ann_id, views_all, views_unique, time_spent_dist) 
                 VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(),${entityData.ymd},
                 '${type}', ${entityData.payload_tour_id},'${entityData.payload_ann_id}',
                 ${entityData.views_all},${entityData.views_unique},'${entityData.time_spent_dist}')`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};


export const updateEntryTypeIfQueryResultNotExist = async (entityData: AnalyticsEntityForAnnTourClick) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET entry_duration_type='${EntryDurationType.DAILY}'
                 WHERE tour_id = ${entityData.tour_id} AND ann_id='${entityData.ann_id}'`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

export const queryToFindAverageForAllDailyType =  (tour_id: number, ann_id: string) => {
  const query = `SELECT CONCAT('[', GROUP_CONCAT(average_value ORDER BY idx), ']') AS avg_time_spent
                 FROM ( SELECT idx, AVG(value) AS average_value FROM
                 (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(time_spent_dist, ',', numbers.n), ',', -1) AS value,
                 numbers.n AS idx FROM ${TableName.AnalyticTourAnnClicks} JOIN (SELECT 1 + units.i + tens.i * 10 AS n
                 FROM (SELECT 0 i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
                 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) units
                 JOIN (SELECT 0 i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
                 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) tens ORDER BY n) AS numbers 
                 ON numbers.n <= (LENGTH(time_spent_dist) - LENGTH(REPLACE(time_spent_dist, ',', '')) + 1)
                 WHERE entry_duration_type='${EntryDurationType.DAILY}' AND ann_id='${ann_id}' 
                 AND tour_id=${tour_id}) subquery GROUP BY idx ORDER BY idx
                 ) average_subquery;`;
  return query;
};
  