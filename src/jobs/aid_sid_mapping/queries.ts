import { TableName } from '../../types';

export const insertToAidSidMapping = (queryExecutionId: string): string => {
  return `LOAD DATA LOCAL INFILE '${queryExecutionId}.csv' INTO TABLE ${TableName.AnalyticsUserAidMapping} 
  FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES
  (aid, sid)
  SET
  created_at = NOW(),
  updated_at = NOW();`;
};