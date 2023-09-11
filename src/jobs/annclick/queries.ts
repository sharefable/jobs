import { EntryDurationType } from '../../api-contract';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from '../mysql';
import {  TableName, AnalyticsAnnClickEntity, AthenaAnnClickEntity } from '../../types';

export const getCurrentTypeForTourIdAnnIdAndYmd = async (
  queryEntity: AthenaAnnClickEntity,
): Promise<AnalyticsAnnClickEntity[]> => {
  const query = `SELECT * FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = 
                  ${queryEntity.payload_tour_id} AND ann_id = '${queryEntity.payload_ann_id}'
                  AND entry_duration_type= '${EntryDurationType.CURRENT}' AND date_ymd = ${queryEntity.ymd};`;
  return await executeQueryToFetchData(query); 
};
  
export const updateViewsForAnnClickTour = async (tour_id: number, 
  ann_id: string, 
  addedViewsAll: number,
  addedViewsUnique: number,
  timeSpentDist: string,
  ymd: number,
  updatedAt: string ) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET updated_at = '${updatedAt}', 
                  views_all = ${addedViewsAll}, views_unique = ${addedViewsUnique},time_spent_dist = '${timeSpentDist}'
                  WHERE date_ymd = ${ymd} AND tour_id =${tour_id} AND ann_id = '${ann_id}' 
                  AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  await executeQueryToInsertOrUpdateData(query);
};
  
export const updateAnnTourTypeToDaily =  async (entityData: AnalyticsAnnClickEntity, updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET updated_at = '${updatedAt}', 
                  entry_duration_type = '${EntryDurationType.DAILY}' WHERE tour_id = ${entityData.tour_id} 
                  AND ann_id = '${entityData.ann_id}' AND entry_duration_type = '${EntryDurationType.CURRENT}';`;
  await executeQueryToInsertOrUpdateData(query);
};
  
export const insertAnnClick =  async (
  entityData: AthenaAnnClickEntity, 
  currentAndUpdatedAt: string,
) => {
  const query = `INSERT INTO ${TableName.AnalyticTourAnnClicks} (created_at, updated_at, date_ymd, 
                  entry_duration_type, tour_id, ann_id, views_all, views_unique, time_spent_dist) 
                  VALUES ('${currentAndUpdatedAt}', '${currentAndUpdatedAt}', ${entityData.ymd},
                  '${EntryDurationType.CURRENT}', ${entityData.payload_tour_id}, '${entityData.payload_ann_id}',
                  ${entityData.views_all}, ${entityData.views_unique}, '${entityData.time_spent_dist}')`;
  await executeQueryToInsertOrUpdateData(query);
};
