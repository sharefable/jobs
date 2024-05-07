import { executeQuery } from '../mysql';
import { AnalyticsUserAidMappingEntity, Tour, TableName } from '../../types';

export const getTourLeadsForYmd = async (
  lowerBound: string, 
  upperBound: string,
): Promise<AnalyticsUserAidMappingEntity[]> => {
  const query = `SELECT t.email, t.tour_id, CONCAT("'", GROUP_CONCAT(DISTINCT t.aid SEPARATOR "', '"), "'") AS aid
                  FROM ${TableName.AnalyticsUserAidMapping}  t
                    JOIN (
                        SELECT DISTINCT email
                        FROM ${TableName.AnalyticsUserAidMapping} 
                        WHERE updated_at > '${lowerBound}' AND updated_at <= '${upperBound}'
                    ) sub ON t.email = sub.email GROUP BY t.email, t.tour_id;`;
  const tourLeads: AnalyticsUserAidMappingEntity[] = await executeQuery(query);
  return tourLeads;
};

export const getTourDetails = async (tourId: number) => {
  const query = `SELECT * From ${TableName.Tour} WHERE id = ${tourId};`;
  const tour: Tour[] = await executeQuery(query);
  return tour;
};