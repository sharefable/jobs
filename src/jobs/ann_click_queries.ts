import { executeQueryToInsertOrUpdateData } from './mysql';
import { EntryDurationType } from '../api-contract';
import { AnalyticsEntityForAnnTourClick, AthenaEntityForAnnTourClick, TableName } from '../types';

export const getCurrentTypeForTourIdAnnIdAndYmd = (queryEntity: AthenaEntityForAnnTourClick) => {
  const query = `SELECT * FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = 
                  ${queryEntity.payload_tour_id} AND ann_id = '${queryEntity.payload_ann_id}'
                  AND entry_duration_type= '${EntryDurationType.CURRENT}' AND date_ymd = ${queryEntity.ymd};`;
  return query;
};

export const updateViewsForAnnClickTour = (tour_id: number, 
  ann_id: string, 
  addedViewsAll: number,
  addedViewsUnique: number,
  timeSpentDist: string,
  ymd: number,
  currentAndUpdatedAt: string ) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET updated_at = '${currentAndUpdatedAt}', 
                 views_all = ${addedViewsAll}, views_unique = ${addedViewsUnique},time_spent_dist = '${timeSpentDist}'
                 WHERE date_ymd = ${ymd} AND tour_id =${tour_id} AND ann_id = '${ann_id}' 
                 AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  return query;
};

export const updateEntryTypeToDaily =  (entityData: AnalyticsEntityForAnnTourClick) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET updated_at = CURRENT_TIMESTAMP(), 
                 entry_duration_type = '${EntryDurationType.DAILY}' WHERE tour_id = ${entityData.tour_id} 
                 AND ann_id = '${entityData.ann_id}';`;
  return query;
};

export const newRowWithCurrentType =  async (entityData: AthenaEntityForAnnTourClick, 
  type :string, currentAndUpdatedAt: 
  string) => {
  const query = `INSERT INTO ${TableName.AnalyticTourAnnClicks} (created_at, updated_at, date_ymd, 
                 entry_duration_type, tour_id, ann_id, views_all, views_unique, time_spent_dist) 
                 VALUES ('${currentAndUpdatedAt}', '${currentAndUpdatedAt}', ${entityData.ymd},
                 '${type}', ${entityData.payload_tour_id}, '${entityData.payload_ann_id}',
                 ${entityData.views_all}, ${entityData.views_unique}, '${entityData.time_spent_dist}')`;
  await executeQueryToInsertOrUpdateData(query);
};

