import { EntryDurationType } from '../../api-contract';
import { executeQuery } from '../mysql';
import {  TableName, AnalyticConversionEntity, AthenaConversionEntity } from '../../types';

export const queryToFetchDataForTourIdDateAndBtnId = async (
  entityData: AthenaConversionEntity,
): Promise<AnalyticConversionEntity[]> => {
  const query = `SELECT * From ${TableName.AnalyticsConversion} where tour_id = ${entityData.payload_tour_id} and 
                   date_ymd = ${entityData.ymd} and btn_id = '${entityData.payload_btn_id}' 
                   and entry_duration_type='${EntryDurationType.CURRENT}'`;
  return await executeQuery(query);
};
    
export const updateConversionTypeToDaily = async (entityData: AnalyticConversionEntity, updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at = '${updatedAt}', 
                   entry_duration_type = '${EntryDurationType.DAILY}' 
                   WHERE date_ymd = ${entityData.date_ymd} AND tour_id = ${entityData.tour_id} 
                   AND btn_id = '${entityData.btn_id}' AND entry_duration_type = '${EntryDurationType.CURRENT}'`;
  await executeQuery(query);
};
  
export const updateClicks = async (addedClicks: number, 
  entityData: AthenaConversionEntity,
  updatedAt: string ) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at= '${updatedAt}', clicks = ${addedClicks} 
                  WHERE date_ymd = ${entityData.ymd} AND tour_id = ${entityData.payload_tour_id} AND 
                  btn_id = '${entityData.payload_btn_id}' AND entry_duration_type = '${EntryDurationType.CURRENT}';`; 
  await executeQuery(query);
};
  
export const insertConversion = async (
  entityData: AthenaConversionEntity, 
  createdAndUpdatedAt: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsConversion} (created_at,updated_at, date_ymd, 
                  entry_duration_type, tour_id, btn_id, clicks)  VALUES ('${createdAndUpdatedAt}', 
                  '${createdAndUpdatedAt}', ${entityData.ymd}, '${EntryDurationType.CURRENT}', 
                  ${entityData.payload_tour_id}, '${entityData.payload_btn_id}',
                  ${entityData.clicks})`;
  await executeQuery(query);
};