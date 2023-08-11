import { EntryDurationType } from '../api-contract';
import { TableName, AthenaQueryEntityForMetrics, AnalyticTourMetrics } from '../types';
import { executeQueryToInsertOrUpdateData } from './mysql';

export const queryToFetchDataForTourIdAndDate = (tour_id: number, ymd: number) => {
  const query = `SELECT * From ${TableName.AnalyticsTourMetrics} where tour_id = ${tour_id} 
                 and date_ymd = ${ymd} and entry_duration_type = '${EntryDurationType.CURRENT}'`;
  return query;
};
  
export const queryForTotalDailyRowsForTourId = (tour_id: number) => {
  const query = `SELECT COUNT(*) AS count FROM ${TableName.AnalyticsTourMetrics} 
                 WHERE tour_id = ${tour_id} and entry_duration_type = '${EntryDurationType.DAILY}'`;
  return query;
};

export const insertQueryForNewRowWithType =  async (entityData: AthenaQueryEntityForMetrics,
  type: string, 
  createdAndUpdatedAt: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsTourMetrics} (created_at, updated_at, date_ymd, 
                 entry_duration_type, tour_id, views_unique, views_all) VALUES ('${createdAndUpdatedAt}', 
                 '${createdAndUpdatedAt}', ${entityData.ymd}, '${type}', ${entityData.payload_tour_id}, 
                 ${entityData.views_unique}, ${entityData.views_all})`;
  await executeQueryToInsertOrUpdateData(query);
};

export const updateViewsForMetrics = (tour_id: number, 
  views_all: number, 
  views_unique: number, 
  ymd: number, 
  updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = '${updatedAt}', 
                 views_all = ${views_all}, views_unique = ${views_unique}
                 WHERE date_ymd = ${ymd} AND tour_id = ${tour_id}`;
  return query;
};
    
export const updateEntryTypeToDaily = (entityData: AnalyticTourMetrics) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = CURRENT_TIMESTAMP(),
                 entry_duration_type = '${EntryDurationType.DAILY}' WHERE date_ymd = ${entityData.date_ymd} 
                 AND tour_id = ${entityData.tour_id} AND entry_duration_type = '${EntryDurationType.CURRENT}';`;
  return query;
};

