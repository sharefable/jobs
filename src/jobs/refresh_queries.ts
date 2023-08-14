import { EntryDurationType } from '../api-contract';
import { AnalyticMetricsEntity, 
  AthenaMetricsEntity, 
  TableName, 
  AthenaConversionEntity, 
  AnalyticConversionEntity, 
  AthenaAnnClickEntity, 
  AnalyticsAnnClickEntity } from '../types';
import { executeQueryToFetchData, executeQueryToInsertOrUpdateData } from './mysql';

/* Metrics queries */

export const queryToFetchDataForTourIdAndDate = async (
  tour_id: number, 
  ymd: number,
): Promise<AnalyticMetricsEntity[]> => {
  const query = `SELECT * From ${TableName.AnalyticsTourMetrics} where tour_id = ${tour_id} 
                   and date_ymd = ${ymd} and entry_duration_type = '${EntryDurationType.CURRENT}'`;
  const metricsTableDataForIdAndYmd: AnalyticMetricsEntity[] = await executeQueryToFetchData(query);
  return metricsTableDataForIdAndYmd;
};
    
export const insertMetrics =  async (entityData: AthenaMetricsEntity,
  type: EntryDurationType, 
  createdAndUpdatedAt: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsTourMetrics} (created_at, updated_at, date_ymd, 
                   entry_duration_type, tour_id, views_unique, views_all) VALUES ('${createdAndUpdatedAt}', 
                   '${createdAndUpdatedAt}', ${entityData.ymd}, '${type}', ${entityData.payload_tour_id}, 
                   ${entityData.views_unique}, ${entityData.views_all})`;
  await executeQueryToInsertOrUpdateData(query);
};
  
export const updateViewsForMetrics = async (tour_id: number, 
  views_all: number, 
  views_unique: number, 
  ymd: number, 
  updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = '${updatedAt}', 
                   views_all = ${views_all}, views_unique = ${views_unique}
                   WHERE date_ymd = ${ymd} AND tour_id = ${tour_id}`;
  await executeQueryToFetchData(query);

};
      
export const updateMetricsTypeToDaily = async (entityData: AnalyticMetricsEntity) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = CURRENT_TIMESTAMP(),
                   entry_duration_type = '${EntryDurationType.DAILY}' WHERE date_ymd = ${entityData.date_ymd} 
                   AND tour_id = ${entityData.tour_id} AND entry_duration_type = '${EntryDurationType.CURRENT}';`;
  await executeQueryToInsertOrUpdateData(query);
};

/* Conversion queries */

export const queryToFetchCurrentType = (tableName: TableName) => {
  const query = `SELECT * From ${tableName} where entry_duration_type = '${EntryDurationType.CURRENT}';`;
  return query;
};
  
export const queryToFetchDataForTourIdDateAndBtnId = async (
  entityData: AthenaConversionEntity,
): Promise<AnalyticConversionEntity[]> => {
  const query = `SELECT * From ${TableName.AnalyticsConversion} where tour_id = ${entityData.payload_tour_id} and 
                   date_ymd = ${entityData.ymd} and btn_id = '${entityData.payload_btn_id}' 
                   and entry_duration_type='${EntryDurationType.CURRENT}'`;
  const conversionDataForIdandYmd: AnalyticConversionEntity[] = await executeQueryToFetchData(query);
  return conversionDataForIdandYmd;
};
    
export const updateConversionTypeToDaily = async (entityData: AnalyticConversionEntity) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at = CURRENT_TIMESTAMP(), 
                   entry_duration_type = '${EntryDurationType.DAILY}' 
                   WHERE date_ymd = ${entityData.date_ymd} AND tour_id = ${entityData.tour_id} 
                   AND btn_id = '${entityData.btn_id}'`;
  await executeQueryToInsertOrUpdateData(query);
};
  
export const updateClicks = async (addedClicks: number, 
  entityData: AthenaConversionEntity,
  updatedAt: string ) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at= '${updatedAt}', clicks = ${addedClicks} 
                 WHERE date_ymd = ${entityData.ymd} AND tour_id = ${entityData.payload_tour_id} AND 
                 btn_id = '${entityData.payload_btn_id}' AND entry_duration_type = '${EntryDurationType.CURRENT}';`; 
  await executeQueryToInsertOrUpdateData(query);
};
  
export const insertConversion = async (
  entityData: AthenaConversionEntity, 
  type: EntryDurationType, 
  createdAndUpdatedAt: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsConversion} (created_at,updated_at, date_ymd, 
                   entry_duration_type, tour_id, btn_id, clicks) 
                   VALUES ('${createdAndUpdatedAt}', '${createdAndUpdatedAt}', ${entityData.ymd}, '${type}',
                   ${entityData.payload_tour_id}, '${entityData.payload_btn_id}',
                   ${entityData.clicks})`;
  await executeQueryToInsertOrUpdateData(query);
};

/* Ann click queries*/

export const getCurrentTypeForTourIdAnnIdAndYmd = async (
  queryEntity: AthenaAnnClickEntity,
): Promise<AnalyticsAnnClickEntity[]> => {
  const query = `SELECT * FROM ${TableName.AnalyticTourAnnClicks} WHERE tour_id = 
                    ${queryEntity.payload_tour_id} AND ann_id = '${queryEntity.payload_ann_id}'
                    AND entry_duration_type= '${EntryDurationType.CURRENT}' AND date_ymd = ${queryEntity.ymd};`;
  const result: AnalyticsAnnClickEntity[] = await executeQueryToFetchData(query);
  return result;

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
  
export const updateAnnTourTypeToDaily =  async (entityData: AnalyticsAnnClickEntity) => {
  const query = `UPDATE ${TableName.AnalyticTourAnnClicks} SET updated_at = CURRENT_TIMESTAMP(), 
                   entry_duration_type = '${EntryDurationType.DAILY}' WHERE tour_id = ${entityData.tour_id} 
                   AND ann_id = '${entityData.ann_id}';`;
  await executeQueryToInsertOrUpdateData(query);
};
  
export const insertAnnClick =  async (
  entityData: AthenaAnnClickEntity, 
  type : EntryDurationType, 
  currentAndUpdatedAt: string,
) => {
  const query = `INSERT INTO ${TableName.AnalyticTourAnnClicks} (created_at, updated_at, date_ymd, 
                   entry_duration_type, tour_id, ann_id, views_all, views_unique, time_spent_dist) 
                   VALUES ('${currentAndUpdatedAt}', '${currentAndUpdatedAt}', ${entityData.ymd},
                   '${type}', ${entityData.payload_tour_id}, '${entityData.payload_ann_id}',
                   ${entityData.views_all}, ${entityData.views_unique}, '${entityData.time_spent_dist}')`;
  await executeQueryToInsertOrUpdateData(query);
};
  
  