import { executeQuery } from '../mysql';
import { AnalyticsUserAidMappingEntity, Tour, TableName } from '../../types';

export const getTourLeadsForYmd = async (lowerBound: string, upperBound: string) => {
  const query = `SELECT 
                  DISTINCT * From ${TableName.AnalyticsUserAidMapping} 
                  WHERE updated_at > '${lowerBound}' AND updated_at <= '${upperBound}'
                ORDER BY date_ymd;`;
  const tourLeads: AnalyticsUserAidMappingEntity[] = await executeQuery(query);
  return tourLeads;
};

export const getTourDetails = async (tourId: number) => {
  const query = `SELECT * From ${TableName.Tour} WHERE id = ${tourId};`;
  const tour: Tour[] = await executeQuery(query);
  return tour;
};