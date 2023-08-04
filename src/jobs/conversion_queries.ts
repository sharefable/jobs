import { EntryDurationType } from '../api-contract';
import {AnalyticTourConversion,  
  AthenaQueryEntityForConversion, 
  TableName } from '../types';
import { executeAppropriateSqlQueryFoFetchData, executeAppropriateSqlQueryToInsertOrUpdateData } from '../utils';

export const queryToFetchCurrentType = (tableName: string) => {
  const query = `SELECT * From ${tableName} where entry_duration_type='${EntryDurationType.CURRENT}'`;
  return query;
};

export const queryToFetchDataForTourIdDateAndBtnId = (entityData: AthenaQueryEntityForConversion) => {
  const query = `SELECT * From ${TableName.AnalyticsConversion} where tour_id = ${entityData.payload_tour_id} and 
                 date_ymd = ${entityData.ymd} and btn_id = '${entityData.payload_btn_id}' 
                 and entry_duration_type='${EntryDurationType.CURRENT}'`;
  return query;
};
  
export const queryToCountDailyTypeForTourIdAndBtnId = (tour_id: number, btn_id: string) => {
  const query = `SELECT COUNT(*) AS count FROM ${TableName.AnalyticsConversion} 
                 WHERE tour_id = ${tour_id} AND btn_id='${btn_id}' AND 
                 entry_duration_type='${EntryDurationType.DAILY}'`;
  return query;
};
  
export const queryToFindSumofClicksForTourIdConversion = (tour_id: number, btn_id: string) => {
  const query = `SELECT SUM(clicks) AS total_clicks FROM ${TableName.AnalyticsConversion} 
                 WHERE tour_id = ${tour_id} AND btn_id='${btn_id}' AND
                 entry_duration_type='${EntryDurationType.DAILY}' GROUP BY tour_id`;
  return query;
};

export const queryToInsertLifeTimeDataConversion  = ( tour_id: number, btn_id: string, clicks: number, ymd: number) => {
  const query = `INSERT INTO ${TableName.AnalyticsConversion} (created_at, updated_at, date_ymd, 
                 entry_duration_type,tour_id, btn_id, clicks) 
                 VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(),
                 ${ymd}, '${EntryDurationType.LIFETIME}',
                 ${tour_id},'${btn_id}',${clicks} )`;
  return query;
};

export const queryToUpdateClicksIfQueryResultExist = (addedClicks: number, entityData: AnalyticTourConversion) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET clicks = ${addedClicks} 
                 WHERE date_ymd =${entityData.date_ymd} AND tour_id =${entityData.tour_id} 
                 AND btn_id ='${entityData.btn_id}'`;
  return query;
};

export const queryUpdateEntryTypeIfQueryResultExist = (entityData: AnalyticTourConversion) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET 
                 entry_duration_type = '${EntryDurationType.DAILY}' 
                 WHERE date_ymd =${entityData.date_ymd} AND tour_id =${entityData.tour_id} 
                 AND btn_id ='${entityData.btn_id}'`;
  return query;
};

export const queryToUpdateClicksIfAthenaResultExist = (addedClicks: number, 
  entityData: AthenaQueryEntityForConversion) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET clicks = ${addedClicks} 
                 WHERE date_ymd =${entityData.ymd} AND tour_id =${entityData.payload_tour_id} 
                 AND btn_id ='${entityData.payload_btn_id}'`;
  return query;
};

export const queryUpdateEntryTypeIfAthenaResultExist = (addedClicks: number, 
  entityData: AthenaQueryEntityForConversion) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET 
                 entry_duration_type = '${EntryDurationType.DAILY}', clicks = ${addedClicks}  
                 WHERE date_ymd =${entityData.ymd} AND tour_id =${entityData.payload_tour_id} 
                 AND btn_id ='${entityData.payload_btn_id}'`;
  return query;
};
  
export const queryToDeleteAllTheDailyEventsConversion = async (tour_id: number, btn_id: string) => {
  const query = `DELETE FROM ${TableName.AnalyticsConversion} WHERE tour_id = ${tour_id} AND 
                 btn_id = '${btn_id}' AND entry_duration_type = '${EntryDurationType.DAILY}'`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};

export const queryToCheckIfTourIdHasLifeTimeValueInConversion = async (tour_id: number, btn_id: string) => {
  const query = `SELECT CASE WHEN COUNT(*) > 0 THEN TRUE ELSE FALSE END AS value
               FROM ${TableName.AnalyticsConversion} WHERE tour_id = ${tour_id} AND btn_id = '${btn_id}'
               AND entry_duration_type = '${EntryDurationType.LIFETIME}'`;
  const check = await executeAppropriateSqlQueryFoFetchData(query, 0);
  return check;
};

export const queryToGetLifeTimeValueOfTourIdConversion = (tour_id: number, btn_id: string) => {
  const query = `SELECT *  FROM ${TableName.AnalyticsConversion} WHERE tour_id = ${tour_id} AND btn_id = '${btn_id}' AND
                 entry_duration_type='${EntryDurationType.LIFETIME}'`;
  return query;
};

export const queryToUpdateLifeTimeValueOfTourIdConversion = (tour_id: number, 
  btn_id: string, 
  clicks: number, 
  date: number) => {
  const query = `UPDATE ${TableName.AnalyticsConversion} SET clicks=${clicks}, date_ymd=${date} 
                 WHERE tour_id = ${tour_id} AND btn_id='${btn_id}'
                 AND entry_duration_type='${EntryDurationType.LIFETIME}'`;
  return query;
};

export const queryToInsertNewRowWithType = async (entityData: AthenaQueryEntityForConversion, type: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsConversion} (created_at,updated_at, date_ymd, 
                 entry_duration_type, tour_id, btn_id, clicks) 
                 VALUES (CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), 
                 ${entityData.ymd}, '${type}',
                 ${entityData.payload_tour_id}, '${entityData.payload_btn_id}',
                 ${entityData.clicks})`;
  await executeAppropriateSqlQueryToInsertOrUpdateData(query);
};