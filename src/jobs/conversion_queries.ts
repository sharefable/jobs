import { EntryDurationType } from '../api-contract';
import {AnalyticTourConversion,  
  AthenaQueryEntityForConversion, 
  TableName } from '../types';
import { executeQueryToInsertOrUpdateData } from './mysql';

export const queryToFetchCurrentType = (tableName: string) => {
  const query = `SELECT * From ${tableName} where entry_duration_type = '${EntryDurationType.CURRENT}';`;
  return query;
};

export const queryToFetchDataForTourIdDateAndBtnId = (entityData: AthenaQueryEntityForConversion) => {
  const query = `SELECT * From ${TableName.AnalyticsConversion} where tour_id = ${entityData.payload_tour_id} and 
                 date_ymd = ${entityData.ymd} and btn_id = '${entityData.payload_btn_id}' 
                 and entry_duration_type='${EntryDurationType.CURRENT}'`;
  return query;
};
  
export const updateEntryTypeToDaily = (entityData: AnalyticTourConversion) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at = CURRENT_TIMESTAMP(), 
                 entry_duration_type = '${EntryDurationType.DAILY}' 
                 WHERE date_ymd = ${entityData.date_ymd} AND tour_id = ${entityData.tour_id} 
                 AND btn_id = '${entityData.btn_id}'`;
  return query;
};

export const updateClicks = (addedClicks: number, 
  entityData: AthenaQueryEntityForConversion,
  updatedAt: string ) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET updated_at= '${updatedAt}', clicks = ${addedClicks} 
                 WHERE date_ymd = ${entityData.ymd} AND tour_id = ${entityData.payload_tour_id} 
                 AND btn_id = '${entityData.payload_btn_id}' AND entry_duration_type = '${EntryDurationType.CURRENT}';`;
  return query;
};

export const newRowWithCurrentType = async (
  entityData: AthenaQueryEntityForConversion, 
  type: string, 
  updatedAt: string ) => {
  const query = `INSERT INTO ${TableName.AnalyticsConversion} (created_at,updated_at, date_ymd, 
                 entry_duration_type, tour_id, btn_id, clicks) 
                 VALUES ('${updatedAt}', '${updatedAt}', ${entityData.ymd}, '${type}',
                 ${entityData.payload_tour_id}, '${entityData.payload_btn_id}',
                 ${entityData.clicks})`;
  await executeQueryToInsertOrUpdateData(query);
};