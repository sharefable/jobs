import { TableName } from '../../types';

export const insertToUserAidMapping = (queryExecutionId: string) => {
  return `LOAD DATA LOCAL INFILE '${queryExecutionId}.csv' INTO TABLE ${TableName.AnalyticsUserAidMapping} 
                 FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES
                 (tour_id, aid, email)
                 SET
                 created_at = NOW(),
                 updated_at = NOW();`;
};