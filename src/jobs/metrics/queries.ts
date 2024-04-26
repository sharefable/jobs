import { EntryDurationType } from '../../api-contract';
import { executeQuery } from '../mysql';
import { AnalyticMetricsEntity, TableName, AthenaMetricsEntity } from '../../types';

export const queryToFetchDataForTourIdAndDate = async (
  tour_id: number, 
  ymd: number,
): Promise<AnalyticMetricsEntity[]> => {
  const query = `SELECT * From ${TableName.AnalyticsTourMetrics} where tour_id = ${tour_id} 
                  and date_ymd = ${ymd} and entry_duration_type = '${EntryDurationType.CURRENT}'`;
  const metricsTableDataForIdAndYmd: AnalyticMetricsEntity[] = await executeQuery(query);
  return metricsTableDataForIdAndYmd;
};
      
export const insertMetrics =  async (
  entityData: AthenaMetricsEntity,
  createdAndUpdatedAt: string) => {
  const query = `INSERT INTO ${TableName.AnalyticsTourMetrics} (created_at, updated_at, date_ymd, 
                  entry_duration_type, tour_id, views_unique, views_all) VALUES ('${createdAndUpdatedAt}', 
                  '${createdAndUpdatedAt}', ${entityData.ymd}, '${EntryDurationType.CURRENT}', 
                  ${entityData.payload_tour_id}, ${entityData.views_unique}, ${entityData.views_all})`;
  await executeQuery(query);
};
    
export const updateViewsForMetrics = async (
  tour_id: number, 
  views_all: number, 
  views_unique: number, 
  ymd: number, 
  updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = '${updatedAt}', 
                  views_all = ${views_all}, views_unique = ${views_unique}
                  WHERE date_ymd = ${ymd} AND tour_id = ${tour_id}`;
  await executeQuery(query);
  
};
        
export const updateMetricsTypeToDaily = async (entityData: AnalyticMetricsEntity, updatedAt: string) => {
  const query = `UPDATE ${TableName.AnalyticsTourMetrics} SET updated_at = '${updatedAt}',
                  entry_duration_type = '${EntryDurationType.DAILY}' WHERE date_ymd = ${entityData.date_ymd} 
                  AND tour_id = ${entityData.tour_id} AND entry_duration_type = '${EntryDurationType.CURRENT}';`;
  await executeQuery(query);
};

export const insertToMetrics = async (tempFilepath: string, dateYmd: string) => {
  const query = `LOAD DATA LOCAL INFILE '${tempFilepath}' REPLACE INTO TABLE ${TableName.AnalyticsTourMetrics} 
                  FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES
                  (tour_id, date_ymd, views_all, views_unique)
                  SET
                  created_at = NOW(),
                  updated_at = NOW(),
                  entry_duration_type = IF(date_ymd < ${dateYmd}, '${EntryDurationType.DAILY}', '${EntryDurationType.CURRENT}');`;
  
  await executeQuery(query);
};