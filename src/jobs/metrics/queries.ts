import { EntryDurationType } from '../../api-contract';
import { executeQuery } from '../mysql';
import { AnalyticMetricsEntity, TableName } from '../../types';

        
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