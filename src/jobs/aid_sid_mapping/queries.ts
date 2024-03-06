import { TableName } from '../../types';

export const insertToAidSidMapping = (tempFilepath: string): string => {
  return `LOAD DATA LOCAL INFILE '${tempFilepath}' INTO TABLE ${TableName.AnalyticsAidSidMapping} 
          FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n' IGNORE 1 LINES
           (aid, sid)
           SET
           created_at = NOW(),
           updated_at = NOW();`;
};